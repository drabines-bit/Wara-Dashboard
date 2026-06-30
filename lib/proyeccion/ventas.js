import { Redis } from "@upstash/redis";
import { searchRead } from "@/lib/odoo";
import { getDashboardData, getDashboardConfig } from "@/lib/kv";
import { hoyArgentina } from "@/lib/format";
import { saltoTrimestral } from "@/lib/proyeccion/inflacion";
import { ratiosMixOdoo } from "@/lib/proyeccion/mix";

function getRedis() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const SUPUESTOS_OVERRIDE_KEY = "proy:ventas:supuestos:override";
const PROYECTOS_KEY          = "proy:ventas:proyectos";
const ABN_DEFAULT_CODE       = "ABN.001";
const ABONOS_SHEET_LABEL     = "Abonos cobrables"; // custom variable confirmada en Sprint 0
const VENTANA_MESES_PROMEDIO = 3;
const CACHE_TTL_MS           = 6 * 60 * 60 * 1000; // 6 horas

function numeroMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  return y * 12 + m;
}
function compararMeses(a, b) { return numeroMes(a) - numeroMes(b); }
function sumarMeses(mes, delta) {
  const [y, m] = mes.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const yy = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${yy}-${String(mm).padStart(2, "0")}`;
}
function mesActualAR() { return hoyArgentina().slice(0, 7); }

// Último mes con datos cerrados (un mes antes del mes corriente AR).
export function mesCerradoActual() {
  return sumarMeses(mesActualAR(), -1);
}

function rangoMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  const ultimoDia = new Date(y, m, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimoDia).padStart(2, "0")}` };
}

let productoAbnIdCache = null;
async function resolverProductoAbn() {
  if (productoAbnIdCache) return productoAbnIdCache;
  const productos = await searchRead("product.product", [["default_code", "=", ABN_DEFAULT_CODE]], ["id"], 1);
  if (!productos.length) throw new Error(`Producto ${ABN_DEFAULT_CODE} no encontrado en Odoo`);
  productoAbnIdCache = productos[0].id;
  return productoAbnIdCache;
}

async function facturacionRecurrenteNeta(productId, desde, hasta) {
  const domain = (tipo) => [
    ["move_id.move_type", "=", tipo],
    ["parent_state", "=", "posted"],
    ["invoice_date", ">=", desde],
    ["invoice_date", "<=", hasta],
    ["product_id", "=", productId],
  ];
  const [facturas, notasCredito] = await Promise.all([
    searchRead("account.move.line", domain("out_invoice"), ["price_subtotal"], 10000),
    searchRead("account.move.line", domain("out_refund"), ["price_subtotal"], 10000),
  ]);
  const sumar = (filas) => filas.reduce((acc, f) => acc + (f.price_subtotal || 0), 0);
  return sumar(facturas) - sumar(notasCredito);
}

// Unidades activas de abonos del mes, leídas de la columna "Abonos cobrables"
// del Sheet (sincronizada como variable custom del Dashboard, confirmada en Sprint 0).
async function unidadesAbonosMes(mes) {
  const [config, data] = await Promise.all([getDashboardConfig(), getDashboardData()]);
  const cv = (config?.customVariables ?? []).find((c) => c.sheetLabel === ABONOS_SHEET_LABEL);
  if (!cv) throw new Error(`No se encontró la variable "${ABONOS_SHEET_LABEL}" en la configuración del Dashboard`);
  const idx = Number(mes.split("-")[1]) - 1;
  const valor = data?.custom?.[cv.id]?.[idx];
  if (valor === null || valor === undefined) throw new Error(`Sin dato de "${ABONOS_SHEET_LABEL}" para ${mes}`);
  return Number(valor);
}

const cacheAncla = new Map();

// CAMBIO 1 — Ancla ARPU realizada. Único punto que toca Odoo/Sheets.
export async function arpuAncla(mesCerrado) {
  const cacheado = cacheAncla.get(mesCerrado);
  if (cacheado && Date.now() - cacheado.ts < CACHE_TTL_MS) return cacheado.data;

  const productId = await resolverProductoAbn();
  const { desde, hasta } = rangoMes(mesCerrado);
  const [neta, U_base] = await Promise.all([
    facturacionRecurrenteNeta(productId, desde, hasta),
    unidadesAbonosMes(mesCerrado),
  ]);
  const T0 = U_base > 0 ? neta / U_base : 0;

  const resultado = { T0, U_base, mesCerrado, facturacionRecurrenteNeta: neta };
  cacheAncla.set(mesCerrado, { data: resultado, ts: Date.now() });
  return resultado;
}

async function getSupuestosOverrideHash() {
  try {
    const r = getRedis();
    if (!r) return {};
    return (await r.hgetall(SUPUESTOS_OVERRIDE_KEY)) ?? {};
  } catch { return {}; }
}

// Movimiento neto histórico (Altas - Bajas) observado en la serie de
// "Abonos cobrables": no hay altas/bajas brutas en el Sheet, sólo el stock.
async function historicoMovimientoNeto() {
  const [config, data] = await Promise.all([getDashboardConfig(), getDashboardData()]);
  const cv = (config?.customVariables ?? []).find((c) => c.sheetLabel === ABONOS_SHEET_LABEL);
  if (!cv) return [];
  const serie = data?.custom?.[cv.id] ?? [];
  const deltas = [];
  for (let i = 1; i < serie.length; i++) {
    const prev = serie[i - 1];
    const curr = serie[i];
    if (prev !== null && prev !== undefined && curr !== null && curr !== undefined) {
      deltas.push(curr - prev);
    }
  }
  return deltas;
}

async function movimientoNetoDefault() {
  const deltas = await historicoMovimientoNeto();
  if (!deltas.length) return 0;
  const ultimos = deltas.slice(-VENTANA_MESES_PROMEDIO);
  return ultimos.reduce((a, b) => a + b, 0) / ultimos.length;
}

async function movimientoNetoMes(mes) {
  const overrides = await getSupuestosOverrideHash();
  if (overrides[mes] !== undefined) return Number(overrides[mes]);
  return movimientoNetoDefault();
}

export async function getSupuestosVentas() {
  return getSupuestosOverrideHash();
}

export async function setSupuestoVentas(mes, valor) {
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  await r.hset(SUPUESTOS_OVERRIDE_KEY, { [mes]: valor });
}

// CAMBIO 2 — U(t) = U(t-1) + Altas(t) - Bajas(t), arrancando de U_base.
// Devuelve [{ mes, U }, ...] de largo cantidadMeses; el índice 0 es el propio
// mesCerrado (ancla, U_base sin proyectar).
export async function proyectarUnidades(U_base, mesCerrado, cantidadMeses = 18) {
  const resultado = [{ mes: mesCerrado, U: Math.round(U_base) }];
  let U = U_base;
  let mes = mesCerrado;
  for (let i = 1; i < cantidadMeses; i++) {
    mes = sumarMeses(mes, 1);
    const neto = await movimientoNetoMes(mes);
    U = Math.max(0, U + neto);
    resultado.push({ mes, U: Math.round(U) });
  }
  return resultado;
}

// CAMBIO 3 — arranca en T0; en mar/jun/sep/dic aplica el salto trimestral
// del motor de inflación. MRR(t) = U(t) * T(t).
export async function proyectarTarifa(T0, unidades) {
  const resultado = [];
  let T = T0;
  for (let i = 0; i < unidades.length; i++) {
    const { mes, U } = unidades[i];
    if (i > 0) {
      const mesNum = Number(mes.split("-")[1]);
      if ([3, 6, 9, 12].includes(mesNum)) {
        T = T * (1 + (await saltoTrimestral(mes)));
      }
    }
    resultado.push({ mes, T: Math.round(T * 100) / 100, U, MRR: Math.round(T * U) });
  }
  return resultado;
}

// CAMBIO 4 — Proyectos puntuales (montos nominales, no se inflan).
export async function getProyectos() {
  try {
    const r = getRedis();
    if (!r) return [];
    return (await r.get(PROYECTOS_KEY)) ?? [];
  } catch { return []; }
}

export async function upsertProyecto(proyecto) {
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  const lista = await getProyectos();
  const idx = lista.findIndex((p) => p.id === proyecto.id);
  if (idx >= 0) lista[idx] = proyecto; else lista.push(proyecto);
  await r.set(PROYECTOS_KEY, lista);
  return lista;
}

export async function eliminarProyecto(id) {
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  const lista = (await getProyectos()).filter((p) => p.id !== id);
  await r.set(PROYECTOS_KEY, lista);
  return lista;
}

export async function facturacionProyectosMes(mes) {
  const lista = await getProyectos();
  return lista
    .filter((p) => p.fechaFacturacion?.slice(0, 7) === mes)
    .reduce((acc, p) => acc + Number(p.monto || 0), 0);
}

// CAMBIO 5 — facturacionNeta(t) = Abonos(t) + Instalaciones(t) + Otros(t) + Proyectos(t).
// Abonos = MRR proyectado (CAMBIO 3). Instalaciones/Otros se derivan del mismo
// ratio sobre el total que ya factura Odoo YTD (ver lib/proyeccion/mix.js):
// total = Abonos / ratioAbonos, y cada categoría = total * su ratio.
// Proyectos queda aparte (no se prorratea — son montos puntuales conocidos).
export async function facturacionNeta(mesCerrado = mesCerradoActual(), cantidadMeses = 18) {
  const { T0, U_base } = await arpuAncla(mesCerrado);
  const [unidades, ratios] = await Promise.all([
    proyectarUnidades(U_base, mesCerrado, cantidadMeses),
    ratiosMixOdoo(mesCerrado),
  ]);
  const tarifa = await proyectarTarifa(T0, unidades);

  const resultado = [];
  for (const fila of tarifa) {
    const proyectos = await facturacionProyectosMes(fila.mes);
    const abonos = fila.MRR;
    const totalMix = ratios.ratioAbonos > 0 ? abonos / ratios.ratioAbonos : abonos;
    const instalaciones = Math.round(totalMix * ratios.ratioInstalaciones);
    const otros = Math.round(totalMix * ratios.ratioOtros);
    resultado.push({
      ...fila,
      abonos,
      instalaciones,
      otros,
      proyectos,
      facturacionNeta: abonos + instalaciones + otros + proyectos,
    });
  }
  return resultado;
}
