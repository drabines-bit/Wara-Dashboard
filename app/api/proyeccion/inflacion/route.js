import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendaInflacion, setOverrideInflacion } from "@/lib/proyeccion/inflacion";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const senda = await sendaInflacion(18);
  return NextResponse.json({ senda }, {
    headers: { "Cache-Control": "private, max-age=21600" },
  });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const { mes, pct } = body || {};
  if (typeof mes !== "string" || !/^\d{4}-\d{2}$/.test(mes) || typeof pct !== "number") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  await setOverrideInflacion(mes, pct);
  return NextResponse.json({ ok: true });
}
