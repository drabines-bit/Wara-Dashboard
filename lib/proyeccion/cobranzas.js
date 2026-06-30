import { Redis } from "@upstash/redis";
import { searchRead } from "@/lib/odoo";
import { getDashboardData } from "@/lib/kv";
import { facturacionNeta } from "@/lib/proyeccion/ventas";
import { numeroMes, compararMeses, sumarMeses, mesActualAR, rangoMes } from "@/lib/proyeccion/fechas";

function getRedis() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const CURVA_KEY        = "proy:cobranzas:curva";
const K                = 6;   // buckets c0..c6, y meses de maduración requeridos
const COHORTES_DESEADAS = 12;
const IVA_FACTOR        = 1.21;
const CATEGORIA_INCOBRABLE = "Incobrable"; // tag de res.partner.category

export function mesCerradoActual() {
  return sumarMeses(mesActualAR(), -1);
}

// Último mes de emisión con K meses ya transcurridos (cohorte "madura").
function ultimoMesMaduro() {
  return sumarMeses(mesActualAR(), -(K + 1));
}

export async function getCurva() {
  try {
    const r = getRedis();
    if (!r) return null;
    return (await r.get(CURVA_KEY)) ?? null;
  } catch { return null; }
}

async function guardarCurva(curva) {
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  await r.set(CURVA_KEY, curva);
}

// CAMBIO 1 — Derivar la curva de cobranza por cohortes de fecha de emisión.
// Pesado: pensado para correr sólo desde el cron de recálculo, nunca on-demand.
export async function derivarCurva() {
  const ultimoMaduro  = ultimoMesMaduro();
  const primerCohorte = sumarMeses(ultimoMaduro, -(COHORTES_DESEADAS - 1));

  const { desde } = rangoMes(primerCohorte);
  const { hasta } = rangoMes(ultimoMaduro);

  const lineas = await searchRead("account.move.line", [
    ["move_id.move_type", "in", ["out_invoice", "out_refund"]],
    ["parent_state", "=", "posted"],
    ["account_type", "=", "asset_receivable"],
    ["invoice_date", ">=", desde],
    ["invoice_date", "<=", hasta],
  ], ["move_type", "invoice_date", "balance", "matched_credit_ids"], 50000);

  // 1) facturado neto por cohorte (mes de emisión); out_invoice y out_refund
  //    ya vienen con signo opuesto en "balance", así que sumar los neta.
  const facturadoPorCohorte = {};
  const lineasFactura = [];
  for (const l of lineas) {
    const cohorte = l.invoice_date.slice(0, 7);
    facturadoPorCohorte[cohorte] = (facturadoPorCohorte[cohorte] || 0) + l.balance;
    if (l.move_type === "out_invoice" && l.matched_credit_ids?.length) {
      lineasFactura.push({ cohorte, partials: l.matched_credit_ids });
    }
  }

  // 2) partials únicos de esas facturas
  const partialIds = [...new Set(lineasFactura.flatMap((l) => l.partials))];
  const partials = partialIds.length
    ? await searchRead("account.partial.reconcile", [["id", "in", partialIds]], ["amount", "credit_move_id"], partialIds.length)
    : [];
  const partialById = new Map(partials.map((p) => [p.id, p]));

  // 3) líneas contraparte (el apunte del pago) para conocer la fecha real de cobro
  const creditLineIds = [...new Set(partials.map((p) => p.credit_move_id?.[0]).filter(Boolean))];
  const creditLineas = creditLineIds.length
    ? await searchRead("account.move.line", [["id", "in", creditLineIds]], ["date", "move_id"], creditLineIds.length)
    : [];
  const creditLineaById = new Map(creditLineas.map((c) => [c.id, c]));

  // 4) move_type de esos apuntes, para excluir notas de crédito (sólo pagos reales)
  const moveIds = [...new Set(creditLineas.map((c) => c.move_id?.[0]).filter(Boolean))];
  const moves = moveIds.length
    ? await searchRead("account.move", [["id", "in", moveIds]], ["move_type"], moveIds.length)
    : [];
  const moveTypeById = new Map(moves.map((m) => [m.id, m.move_type]));

  // 5) acumular cobrado por cohorte y bucket k = meses entre el pago y la emisión
  const cobradoPorCohorte = {};
  for (const { cohorte, partials: partialIdsDeLinea } of lineasFactura) {
    for (const pid of partialIdsDeLinea) {
      const partial = partialById.get(pid);
      if (!partial) continue;
      const creditLinea = creditLineaById.get(partial.credit_move_id?.[0]);
      if (!creditLinea) continue;
      if (moveTypeById.get(creditLinea.move_id?.[0]) === "out_refund") continue; // sólo pagos reales

      const k = numeroMes(creditLinea.date.slice(0, 7)) - numeroMes(cohorte);
      if (k < 0 || k > K) continue; // fuera de la ventana de buckets -> queda en "cola"

      if (!cobradoPorCohorte[cohorte]) cobradoPorCohorte[cohorte] = Array(K + 1).fill(0);
      cobradoPorCohorte[cohorte][k] += partial.amount;
    }
  }

  // 6) promediar cₖ y cola sobre las cohortes con facturación > 0
  const cohortes = [];
  for (let mes = primerCohorte; compararMeses(mes, ultimoMaduro) <= 0; mes = sumarMeses(mes, 1)) {
    cohortes.push(mes);
  }
  const cohortesConDatos = cohortes.filter((co) => (facturadoPorCohorte[co] || 0) > 0);

  const c = Array(K + 1).fill(0);
  const colas = [];
  for (const cohorte of cohortesConDatos) {
    const facturado = facturadoPorCohorte[cohorte];
    const cobrado = cobradoPorCohorte[cohorte] || Array(K + 1).fill(0);
    let acumulado = 0;
    for (let k = 0; k <= K; k++) {
      const ratio = cobrado[k] / facturado;
      c[k] += ratio;
      acumulado += ratio;
    }
    colas.push(Math.max(0, 1 - acumulado));
  }
  const n = cohortesConDatos.length || 1;
  const cFinal = c.map((v) => v / n);
  const cola = colas.length ? colas.reduce((a, b) => a + b, 0) / colas.length : 0;

  const curva = {
    c: cFinal,
    cola,
    cohortesUsadas: cohortesConDatos.length,
    computedAt: new Date().toISOString(),
  };
  await guardarCurva(curva);
  return curva;
}

let categoriaIncobrableIdCache;
async function resolverCategoriaIncobrable() {
  if (categoriaIncobrableIdCache !== undefined) return categoriaIncobrableIdCache;
  const cats = await searchRead("res.partner.category", [["name", "=", CATEGORIA_INCOBRABLE]], ["id"], 1);
  categoriaIncobrableIdCache = cats[0]?.id ?? null;
  return categoriaIncobrableIdCache;
}

// Cartera vencida hace más de K meses (la curva ya no la captura vía cₖ),
// excluyendo partners marcados como incobrables.
async function carteraVencidaMayorAK(mesCerrado, kBuckets) {
  const catId = await resolverCategoriaIncobrable();
  const cutoff = sumarMeses(mesCerrado, -kBuckets);
  const domain = [
    ["move_type", "=", "out_invoice"],
    ["state", "=", "posted"],
    ["payment_state", "in", ["not_paid", "partial"]],
    ["invoice_date", "<", `${cutoff}-01`],
    ["amount_residual", ">", 0],
  ];
  if (catId) domain.push(["partner_id.category_id", "not in", [catId]]);
  const facturas = await searchRead("account.move", domain, ["amount_residual"], 10000);
  return facturas.reduce((acc, f) => acc + f.amount_residual, 0);
}

// Facturación neta total (todos los productos) de un mes, directo de Odoo.
async function facturacionNetaTotalOdoo(mes) {
  const { desde, hasta } = rangoMes(mes);
  const lineas = await searchRead("account.move.line", [
    ["move_id.move_type", "in", ["out_invoice", "out_refund"]],
    ["parent_state", "=", "posted"],
    ["account_type", "=", "asset_receivable"],
    ["invoice_date", ">=", desde],
    ["invoice_date", "<=", hasta],
  ], ["balance"], 20000);
  return lineas.reduce((acc, l) => acc + l.balance, 0);
}

// Facturación real de un mes pasado: prioriza el módulo Facturación existente
// (wara:data.facturacion.real, sincronizado del Sheet del año en curso); si el
// mes cae fuera de ese año o no tiene dato cargado, cae a Odoo directo.
async function facturacionRealMes(mes) {
  const anioActual = mesActualAR().slice(0, 4);
  if (mes.startsWith(anioActual)) {
    const data = await getDashboardData();
    const idx = Number(mes.split("-")[1]) - 1;
    const valor = data?.facturacion?.real?.[idx];
    if (valor !== null && valor !== undefined) return Number(valor);
  }
  return facturacionNetaTotalOdoo(mes);
}

// CAMBIO 3 — Convolución: aplica la curva cacheada a facturación real (pasado)
// + proyectada (Sprint 2, futuro). Nunca recalcula la curva: sólo la lee de KV.
export async function cobranzaProyectada(mesCerrado = mesCerradoActual(), cantidadMeses = 18) {
  const curva = await getCurva();
  if (!curva) {
    throw new Error('La curva de cobranza todavía no fue calculada. Ejecutá POST /api/proyeccion/cobranzas/recalcular.');
  }
  const { c, cola } = curva;
  const kBuckets = c.length - 1;

  const proyeccionVentas = await facturacionNeta(mesCerrado, cantidadMeses);
  const ventasFuturasPorMes = new Map(
    proyeccionVentas
      .filter((f) => compararMeses(f.mes, mesCerrado) > 0)
      .map((f) => [f.mes, f.facturacionNeta])
  );

  const facturacionNetaPorMes = new Map();
  const primerMesNecesario = sumarMeses(mesCerrado, -kBuckets);
  for (let mes = primerMesNecesario; compararMeses(mes, mesCerrado) <= 0; mes = sumarMeses(mes, 1)) {
    facturacionNetaPorMes.set(mes, await facturacionRealMes(mes));
  }
  for (const [mes, valor] of ventasFuturasPorMes) facturacionNetaPorMes.set(mes, valor);

  const facturacionBrutaMes = (mes) => (facturacionNetaPorMes.get(mes) ?? 0) * IVA_FACTOR;

  const carteraVencida = await carteraVencidaMayorAK(mesCerrado, kBuckets);
  const mesesRecuperoCola = Math.min(kBuckets, cantidadMeses) || 1;
  const recuperoColaMensual = carteraVencida / mesesRecuperoCola;

  const detalle = [];
  let mesT = mesCerrado;
  for (let i = 0; i < cantidadMeses; i++) {
    let cobranzaConIva = 0;
    for (let k = 0; k <= kBuckets; k++) {
      cobranzaConIva += c[k] * facturacionBrutaMes(sumarMeses(mesT, -k));
    }
    const recupero = i < mesesRecuperoCola ? recuperoColaMensual : 0;
    cobranzaConIva += recupero;

    const cobranzaNeta = cobranzaConIva / IVA_FACTOR;
    const ivaPasante = cobranzaConIva - cobranzaNeta;

    detalle.push({
      mes: mesT,
      facturacionNeta: Math.round(facturacionNetaPorMes.get(mesT) ?? 0),
      facturacionBruta: Math.round(facturacionBrutaMes(mesT)),
      cobranzaConIva: Math.round(cobranzaConIva),
      cobranzaNeta: Math.round(cobranzaNeta),
      ivaPasante: Math.round(ivaPasante),
      recuperoCola: Math.round(recupero),
    });
    mesT = sumarMeses(mesT, 1);
  }

  return { detalle, curva: { ...curva, cola } };
}
