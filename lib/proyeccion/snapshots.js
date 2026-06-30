import { Redis } from "@upstash/redis";
import { obtenerProyeccionCompleta } from "@/lib/proyeccion/orquestador";
import { hoyArgentina } from "@/lib/format";
import { mesActualAR } from "@/lib/proyeccion/fechas";

function getRedis() {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const SNAPSHOT_PREFIX = "proy:snapshots:";

export async function getSnapshot(mesCorrida) {
  try {
    const r = getRedis();
    if (!r) return null;
    return (await r.get(`${SNAPSHOT_PREFIX}${mesCorrida}`)) ?? null;
  } catch { return null; }
}

async function guardarSnapshot(mesCorrida, data) {
  const r = getRedis();
  if (!r) throw new Error("Redis no configurado — verificá las variables de entorno Upstash");
  await r.set(`${SNAPSHOT_PREFIX}${mesCorrida}`, data);
}

// CAMBIO 1 — Corre la proyección completa y guarda el snapshot del mes de
// corrida actual. Idempotente: si ya existe snapshot para este mes, no recalcula.
export async function tomarSnapshotMensual() {
  const mesCorrida = mesActualAR();
  const existente = await getSnapshot(mesCorrida);
  if (existente) return { ok: true, skipped: true, mesCorrida };

  const { detalle } = await obtenerProyeccionCompleta(18);
  const horizonte = detalle.map((d) => ({
    mes: d.mes,
    facturacionNeta: d.facturacionNeta,
    cobranza: d.cobranzaConIva,
    resultado: d.resultadoDevengado,
  }));
  const snapshot = { corridaEl: hoyArgentina(), horizonte };
  await guardarSnapshot(mesCorrida, snapshot);
  return { ok: true, skipped: false, mesCorrida, snapshot };
}
