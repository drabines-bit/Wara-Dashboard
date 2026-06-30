import { Redis } from "@upstash/redis";
import { searchRead } from "@/lib/odoo";
import { inflacionAcumulada } from "@/lib/proyeccion/inflacion";
import { arpuAncla, facturacionNeta, mesCerradoActual } from "@/lib/proyeccion/ventas";
import { compararMeses, sumarMeses, rangoMes } from "@/lib/proyeccion/fechas";

function getRedis() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const MAPEO_KEY     = "proy:costos:mapeo";
const OVERRIDES_KEY = "proy:costos:overrides";
const TIPOS_VALIDOS = ["fijo", "var_unidades", "pct_facturacion"];

export { mesCerradoActual };

// CAMBIO 1 — Baseline del último mes cerrado: account.move.line internal_group='expense'.
export async function baselineCostos(mesCerrado) {
  const { desde, hasta } = rangoMes(mesCerrado);
  const lineas = await searchRead("account.move.line", [
    ["account_id.internal_group", "=", "expense"],
    ["parent_state", "=", "posted"],
    ["date", ">=", desde],
    ["date", "<=", hasta],
  ], ["account_id", "balance"], 20000);

  const porCuenta = new Map();
  for (const l of lineas) {
    const [accountId, nombre] = l.account_id;
    const actual = porCuenta.get(accountId) ?? { accountId, nombre, montoBase: 0 };
    actual.montoBase += l.balance;
    porCuenta.set(accountId, actual);
  }
  return [...porCuenta.values()].sort((a, b) => b.montoBase - a.montoBase);
}

// CAMBIO 2 — Tabla de mapeo (KV).
export async function getMapeo() {
  try {
    const r = getRedis();
    if (!r) return {};
    return (await r.hgetall(MAPEO_KEY)) ?? {};
  } catch { return {}; }
}

export async function setTipoCuenta(accountId, tipo, nombre) {
  if (!TIPOS_VALIDOS.includes(tipo)) throw new Error(`Tipo inválido: ${tipo}`);
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  await r.hset(MAPEO_KEY, { [accountId]: { tipo, nombre } });
}

function esCuentaIIBB(nombre) {
  return /^iibb\b/i.test(nombre) || /ingresos brutos/i.test(nombre);
}

// Clasificación efectiva de una cuenta: lo guardado en el mapeo, o el default
// (IIBB -> pct_facturacion confiado; el resto -> fijo, marcado para revisar).
export function clasificarCuenta(accountId, nombre, mapeo) {
  const guardado = mapeo[accountId];
  if (guardado) return { tipo: guardado.tipo, nombre: guardado.nombre ?? nombre, revisar: false };
  if (esCuentaIIBB(nombre)) return { tipo: "pct_facturacion", nombre, revisar: false };
  return { tipo: "fijo", nombre, revisar: true };
}

// Cuentas del baseline + su clasificación efectiva — usado por el endpoint de mapeo.
export async function cuentasConClasificacion(mesCerrado = mesCerradoActual()) {
  const [baseline, mapeo] = await Promise.all([baselineCostos(mesCerrado), getMapeo()]);
  return baseline.map((cuenta) => ({
    ...cuenta,
    ...clasificarCuenta(cuenta.accountId, cuenta.nombre, mapeo),
  }));
}

export async function getOverrides() {
  try {
    const r = getRedis();
    if (!r) return {};
    return (await r.hgetall(OVERRIDES_KEY)) ?? {};
  } catch { return {}; }
}

export async function setOverrideCosto(accountId, mes, monto) {
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  const overrides = await getOverrides();
  const actual = { ...(overrides[accountId] ?? {}), [mes]: monto };
  await r.hset(OVERRIDES_KEY, { [accountId]: actual });
}

// Factor de inflación acumulada desde el mes base (sin inflar el propio mes
// base: inflacionAcumulada(desde,hasta) incluye la inflación de "desde", así
// que para t=mesBase el factor debe ser 1 y recién compone a partir de t=mesBase+1.
async function factorDesdeBase(mesBase, mes) {
  if (compararMeses(mes, mesBase) <= 0) return 1;
  return inflacionAcumulada(sumarMeses(mesBase, 1), mes);
}

// CAMBIO 3 — Proyección de costos por tipo + resultado.
export async function proyectarCostos(mesCerrado = mesCerradoActual(), cantidadMeses = 18) {
  const [cuentas, overrides, { U_base }, ventas] = await Promise.all([
    cuentasConClasificacion(mesCerrado),
    getOverrides(),
    arpuAncla(mesCerrado),
    facturacionNeta(mesCerrado, cantidadMeses),
  ]);

  const facturacionNetaBase = ventas[0]?.facturacionNeta ?? 0;
  const facturacionNetaPorMes = new Map(ventas.map((f) => [f.mes, f.facturacionNeta]));
  const unidadesPorMes = new Map(ventas.map((f) => [f.mes, f.U]));

  const detalle = [];
  let mes = mesCerrado;
  for (let i = 0; i < cantidadMeses; i++) {
    const factor = await factorDesdeBase(mesCerrado, mes);
    const U_t = unidadesPorMes.get(mes) ?? U_base;
    const facturacionNeta_t = facturacionNetaPorMes.get(mes) ?? 0;

    const porCuenta = [];
    let totalCostos = 0;
    for (const cuenta of cuentas) {
      const overrideMonto = Number(overrides[cuenta.accountId]?.[mes] ?? 0);
      let monto;
      if (cuenta.tipo === "var_unidades") {
        monto = U_base > 0 ? (cuenta.montoBase / U_base) * U_t * factor : 0;
      } else if (cuenta.tipo === "pct_facturacion") {
        monto = facturacionNetaBase > 0 ? (cuenta.montoBase / facturacionNetaBase) * facturacionNeta_t : 0;
      } else { // fijo
        monto = cuenta.montoBase * factor + overrideMonto;
      }
      totalCostos += monto;
      porCuenta.push({
        accountId: cuenta.accountId,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        monto: Math.round(monto),
      });
    }

    detalle.push({
      mes,
      facturacionNeta: Math.round(facturacionNeta_t),
      costos: Math.round(totalCostos),
      resultado: Math.round(facturacionNeta_t - totalCostos),
      porCuenta,
    });
    mes = sumarMeses(mes, 1);
  }

  return detalle;
}
