import { Redis } from "@upstash/redis";

// El cliente se crea dentro de cada función, no al importar el módulo.
// Así el build de Next.js no falla si las variables no están disponibles aún.
function getRedis() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const DATA_KEY   = "wara:data";
const CONFIG_KEY = "wara:config";
const SYNC_KEY   = "wara:lastSync";

export async function getDashboardData() {
  try {
    const r = getRedis();
    if (!r) return null;
    return await r.get(DATA_KEY);
  } catch { return null; }
}

export async function setDashboardData(data) {
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  await r.set(DATA_KEY, data);
}

export async function getDashboardConfig() {
  try {
    const r = getRedis();
    if (!r) return getDefaultConfig();
    const stored = await r.get(CONFIG_KEY);
    if (!stored) return getDefaultConfig();
    return deepMerge(getDefaultConfig(), stored);
  } catch { return getDefaultConfig(); }
}

function deepMerge(defaults, stored) {
  const result = { ...defaults };
  for (const key of Object.keys(stored || {})) {
    const isPlainObject =
      typeof stored[key] === 'object' &&
      stored[key] !== null &&
      !Array.isArray(stored[key]);
    result[key] = isPlainObject
      ? deepMerge(defaults[key] || {}, stored[key])
      : stored[key];
  }
  return result;
}

export async function getLastSync() {
  try {
    const r = getRedis();
    if (!r) return null;
    return await r.get(SYNC_KEY);
  } catch { return null; }
}

export async function setLastSync() {
  try {
    const r = getRedis();
    if (!r) return;
    await r.set(SYNC_KEY, new Date().toISOString());
  } catch { /* silencioso */ }
}

export async function setDashboardConfig(config) {
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  await r.set(CONFIG_KEY, config);
}

const NOTAS_PREFIX = 'wara:notas';

export async function getNotas(year) {
  try {
    const r = getRedis();
    if (!r) return {};
    return (await r.get(`${NOTAS_PREFIX}:${year}`)) ?? {};
  } catch { return {}; }
}

export async function setNota(year, mes, texto) {
  try {
    const r = getRedis();
    if (!r) return false;
    const notas = await getNotas(year);
    if (texto?.trim()) {
      notas[String(mes)] = texto.trim();
    } else {
      delete notas[String(mes)];
    }
    await r.set(`${NOTAS_PREFIX}:${year}`, notas);
    return true;
  } catch { return false; }
}

export function getDefaultConfig() {
  return {
    semaphores: {
      cumplimiento: { verde: 95,  amarillo: 80  },
      variacion:    { verde: 5,   rojo: -5      },
      liquidez:     { verde: 1.5, amarillo: 1.0 },
    },
    labels: {
      facturacion: "Facturación Real",
      cobranza:    "Cobranza Real",
      variacion:   "Variación M/M Facturación",
      liquidez:    "Ratio Liquidez Corriente",
    },
    charts: { showTrends: true, showSolvency: true, showComposition: true },
    objetivos: { facturacion: Array(12).fill(null), cobranza: Array(12).fill(null) },
    customVariables: [],
    links: {
      web:        { label: 'Sitio web',  url: '', enabled: true  },
      instagram:  { label: 'Instagram',  url: '', enabled: true  },
      linkedin:   { label: 'LinkedIn',   url: '', enabled: false },
      facebook:   { label: 'Facebook',   url: '', enabled: false },
      email:      { label: 'Contacto',   url: '', enabled: true  },
      erp:        { label: 'ERP',        url: '', enabled: true  },
      backoffice: { label: 'Backoffice', url: '', enabled: true  },
    },
  };
}