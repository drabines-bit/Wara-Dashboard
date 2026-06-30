import { Redis } from "@upstash/redis";
import { hoyArgentina } from "@/lib/format";

// El cliente se crea dentro de cada función, no al importar el módulo,
// para no romper el build si las variables de entorno no están disponibles.
function getRedis() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const REM_KEY      = "proy:inflacion:rem";
const OVERRIDE_KEY = "proy:inflacion:override";
const IPC_URL       = "https://api.argentinadatos.com/v1/finanzas/indices/inflacion";
const CACHE_TTL_MS  = 6 * 60 * 60 * 1000; // 6 horas

const cache = { rem: null, override: null, ipc: null };

function vigente(entrada) {
  return entrada && Date.now() - entrada.ts < CACHE_TTL_MS;
}

async function getRemHash() {
  if (vigente(cache.rem)) return cache.rem.data;
  let data = {};
  try {
    const r = getRedis();
    if (r) data = (await r.hgetall(REM_KEY)) ?? {};
  } catch { data = {}; }
  cache.rem = { data, ts: Date.now() };
  return data;
}

async function getOverrideHash() {
  if (vigente(cache.override)) return cache.override.data;
  let data = {};
  try {
    const r = getRedis();
    if (r) data = (await r.hgetall(OVERRIDE_KEY)) ?? {};
  } catch { data = {}; }
  cache.override = { data, ts: Date.now() };
  return data;
}

async function getIpcSerie() {
  if (vigente(cache.ipc)) return cache.ipc.data;
  let data = [];
  try {
    const res = await fetch(IPC_URL, {
      next: { revalidate: 21600 },
      headers: { Accept: "application/json" },
    });
    if (res.ok) data = await res.json(); // [{ fecha: "YYYY-MM-DD", valor }, ...]
  } catch { data = []; }
  cache.ipc = { data, ts: Date.now() };
  return data;
}

// IPC INDEC realizado — misma fuente que usa app/api/macroeconomia/route.js.
// Devuelve la fracción (0.025 = 2,5%) o null si todavía no fue publicado.
export async function ipcRealizado(mes) {
  const serie = await getIpcSerie();
  const entrada = serie.find((d) => d.fecha?.slice(0, 7) === mes);
  return entrada ? entrada.valor / 100 : null;
}

function numeroMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  return y * 12 + m;
}

function compararMeses(a, b) {
  return numeroMes(a) - numeroMes(b);
}

function sumarMeses(mes, delta) {
  const [y, m] = mes.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const yy = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${yy}-${String(mm).padStart(2, "0")}`;
}

function mesActualAR() {
  return hoyArgentina().slice(0, 7);
}

// mes = "YYYY-MM". Devuelve el % como fracción (0.025 = 2,5%).
export async function inflacionMensual(mes) {
  const overrides = await getOverrideHash();
  if (overrides[mes] !== undefined) return Number(overrides[mes]) / 100;

  const actual = mesActualAR();
  if (compararMeses(mes, actual) < 0) {
    const real = await ipcRealizado(mes);
    if (real !== null) return real;
  }

  const rem = await getRemHash();
  return rem[mes] !== undefined ? Number(rem[mes]) / 100 : 0;
}

// Producto de (1 + inflacionMensual(m)) para cada mes en [desde, hasta]. 1 si el rango es vacío/invertido.
export async function inflacionAcumulada(desde, hasta) {
  if (compararMeses(desde, hasta) > 0) return 1;
  let factor = 1;
  let mes = desde;
  while (compararMeses(mes, hasta) <= 0) {
    factor *= 1 + (await inflacionMensual(mes));
    mes = sumarMeses(mes, 1);
  }
  return factor;
}

// mesAumento = "YYYY-MM", debe ser mar/jun/sep/dic. Recompone la inflación
// del trimestre ya transcurrido (los 3 meses previos al mes de aumento).
export async function saltoTrimestral(mesAumento) {
  const mesNum = Number(mesAumento.split("-")[1]);
  if (![3, 6, 9, 12].includes(mesNum)) {
    throw new Error(`saltoTrimestral: ${mesAumento} no es un mes de aumento válido (mar/jun/sep/dic)`);
  }
  const desde = sumarMeses(mesAumento, -3);
  const hasta = sumarMeses(mesAumento, -1);
  return (await inflacionAcumulada(desde, hasta)) - 1;
}

// Senda mensual para la UI: [{ mes, pct, fuente }], pct en porcentaje (2.5 = 2,5%).
export async function sendaInflacion(cantidadMeses = 18) {
  const actual = mesActualAR();
  const overrides = await getOverrideHash();
  const senda = [];
  let mes = actual;
  for (let i = 0; i < cantidadMeses; i++) {
    const pct = await inflacionMensual(mes);
    const fuente = overrides[mes] !== undefined
      ? "override"
      : compararMeses(mes, actual) < 0 ? "realizado" : "rem";
    senda.push({ mes, pct: Math.round(pct * 10000) / 100, fuente });
    mes = sumarMeses(mes, 1);
  }
  return senda;
}

export async function setOverrideInflacion(mes, pct) {
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  await r.hset(OVERRIDE_KEY, { [mes]: pct });
  cache.override = null; // forzar relectura en la próxima consulta
}
