import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Client } from "@upstash/qstash";
import { authOptions } from "@/lib/auth";
import { obtenerProyeccionCompleta } from "@/lib/proyeccion/orquestador";
import { sendaInflacion } from "@/lib/proyeccion/inflacion";
import { getSupuestosVentas, getProyectos } from "@/lib/proyeccion/ventas";
import { enviarReporteProyeccion } from "@/lib/proyeccion/email";

const CRON_MENSUAL = "0 7 1 * *"; // día 1 de cada mes, 07:00

function checkCronSecret(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (req.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

// POST — invocado por QStash (o manualmente con el secreto). Regenera el PDF
// headless (sin navegador: sin logo bitmap ni gráfico, ver generatePdfProyeccion.js)
// y lo envía por email. Desactivado salvo PROYECCION_REPORT_CRON=on.
export async function POST(req) {
  if (!checkCronSecret(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (process.env.PROYECCION_REPORT_CRON !== "on") {
    return NextResponse.json({ ok: false, skipped: true, motivo: "PROYECCION_REPORT_CRON no está en 'on'" });
  }

  try {
    const { generateProyeccionReport } = await import("@/lib/proyeccion/generatePdfProyeccion");

    const [{ detalle, subtotalesAnuales }, senda, overridesVentas, proyectos] = await Promise.all([
      obtenerProyeccionCompleta(18),
      sendaInflacion(18),
      getSupuestosVentas(),
      getProyectos(),
    ]);

    const pdfBase64 = await generateProyeccionReport({
      detalle, subtotalesAnuales,
      supuestos: { senda, overridesVentas, proyectos },
      chartCanvas: null, // headless: sin DOM no hay canvas de Chart.js que capturar
      mode: "base64",
    });
    if (!pdfBase64) throw new Error("generateProyeccionReport no devolvió el PDF en base64");

    const primerDic = subtotalesAnuales.find((s) => s.hasta.endsWith("-12"));
    const resultadoAlCierre = primerDic ? primerDic.resultadoDevengado : detalle[detalle.length - 1].resultadoDevengado;
    const cajaAcumulada18m = detalle.reduce((acc, d) => acc + d.cajaOperativa, 0);

    await enviarReporteProyeccion({
      pdfBase64, mesCorrida: detalle[0].mes, resultadoAlCierre, cajaAcumulada18m,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[proyeccion/email/cron]", err);
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
    destination: `${appUrl}/api/proyeccion/email/cron`,
    cron: CRON_MENSUAL,
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${process.env.CRON_SECRET}`,
    },
  });

  return NextResponse.json({ ok: true, scheduleId: schedule.scheduleId, cron: CRON_MENSUAL });
}
