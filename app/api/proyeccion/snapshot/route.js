import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Client } from "@upstash/qstash";
import { authOptions } from "@/lib/auth";
import { tomarSnapshotMensual } from "@/lib/proyeccion/snapshots";

const CRON_MENSUAL = "0 5 1 * *"; // día 1 de cada mes, 05:00

function checkCronSecret(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (req.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

// POST — invocado por QStash (o manualmente con el secreto). Idempotente por
// mes de corrida: si ya existe proy:snapshots:{mes actual}, no recalcula.
export async function POST(req) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const resultado = await tomarSnapshotMensual();
    return NextResponse.json(resultado);
  } catch (err) {
    console.error("[proyeccion/snapshot]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — admin: crea/actualiza el schedule mensual de QStash que llama al POST de arriba.
export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const { appUrl } = await req.json();
  if (!appUrl?.startsWith("https://")) {
    return NextResponse.json({ error: `URL inválida: "${appUrl}". Debe empezar con https://` }, { status: 400 });
  }
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET no configurado en las variables de entorno" }, { status: 500 });
  }

  const qClient = new Client({
    token:   process.env.QSTASH_TOKEN ?? "",
    baseUrl: process.env.QSTASH_URL   ?? undefined,
  });

  const schedule = await qClient.schedules.create({
    destination: `${appUrl}/api/proyeccion/snapshot`,
    cron: CRON_MENSUAL,
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${process.env.CRON_SECRET}`,
    },
  });

  return NextResponse.json({ ok: true, scheduleId: schedule.scheduleId, cron: CRON_MENSUAL });
}
