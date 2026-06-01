import { kv } from "@vercel/kv";

const DATA_KEY = "wara:data";
const CONFIG_KEY = "wara:config";

export async function getDashboardData() {
  try {
    return await kv.get(DATA_KEY);
  } catch {
    return null;
  }
}

export async function setDashboardData(data) {
  await kv.set(DATA_KEY, data);
}

export async function getDashboardConfig() {
  try {
    const config = await kv.get(CONFIG_KEY);
    return config ?? getDefaultConfig();
  } catch {
    return getDefaultConfig();
  }
}

export async function setDashboardConfig(config) {
  await kv.set(CONFIG_KEY, config);
}

export function getDefaultConfig() {
  return {
    semaphores: {
      cumplimiento:  { verde: 95,  amarillo: 80  },
      variacion:     { verde: 5,   rojo: -5      },
      liquidez:      { verde: 1.5, amarillo: 1.0 },
    },
    labels: {
      facturacion: "Facturación Real",
      cobranza:    "Cobranza Real",
      variacion:   "Variación M/M Facturación",
      liquidez:    "Ratio Liquidez Corriente",
    },
    charts: {
      showTrends:      true,
      showSolvency:    true,
      showComposition: true,
    },
    objetivos: {
      facturacion: Array(12).fill(null),
      cobranza:    Array(12).fill(null),
    },
  };
}
