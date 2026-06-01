import { Redis } from "@upstash/redis";

// El cliente se crea dentro de cada función, no al importar el módulo.
// Así el build de Next.js no falla si las variables no están disponibles aún.
function getRedis() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const DATA_KEY   = "wara:data";
const CONFIG_KEY = "wara:config";

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
    const config = await r.get(CONFIG_KEY);
    return config ?? getDefaultConfig();
  } catch { return getDefaultConfig(); }
}

export async function setDashboardConfig(config) {
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  await r.set(CONFIG_KEY, config);
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
  };
}