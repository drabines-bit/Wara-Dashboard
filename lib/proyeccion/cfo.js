import { Redis } from "@upstash/redis";
import { hoyArgentina } from "@/lib/format";
import { compararMeses } from "@/lib/proyeccion/fechas";

function getRedis() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const CFO_KEY = "proy:backtest:cfo";

export async function getCfoTodos() {
  try {
    const r = getRedis();
    if (!r) return {};
    return (await r.hgetall(CFO_KEY)) ?? {};
  } catch { return {}; }
}

export async function getCfoRango(desde, hasta) {
  const todos = await getCfoTodos();
  if (!desde && !hasta) return todos;
  return Object.fromEntries(
    Object.entries(todos).filter(([mes]) =>
      (!desde || compararMeses(mes, desde) >= 0) && (!hasta || compararMeses(mes, hasta) <= 0)
    )
  );
}

// CAMBIO 2 — upsert de la proyección manual del CFO para un mes; sella cargadoEl.
export async function setCfoMes(mes, { facturacion, cobranzas, resultado }) {
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  const entrada = { facturacion, cobranzas, resultado, cargadoEl: hoyArgentina() };
  await r.hset(CFO_KEY, { [mes]: entrada });
  return entrada;
}
