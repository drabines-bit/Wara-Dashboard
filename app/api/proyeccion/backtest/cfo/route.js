import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCfoRango, setCfoMes } from "@/lib/proyeccion/cfo";

function requireAdmin(session) {
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  return null;
}

// GET ?desde=YYYY-MM&hasta=YYYY-MM (opcionales) — proyección manual del CFO por rango.
export async function GET(req) {
  const session = await getServerSession(authOptions);
  const denegado = requireAdmin(session);
  if (denegado) return denegado;

  const { searchParams } = new URL(req.url);
  const cfo = await getCfoRango(searchParams.get("desde"), searchParams.get("hasta"));
  return NextResponse.json({ cfo });
}

// POST { mes, facturacion, cobranzas, resultado } — upsert por mes.
export async function POST(req) {
  const session = await getServerSession(authOptions);
  const denegado = requireAdmin(session);
  if (denegado) return denegado;

  const body = await req.json();
  const { mes, facturacion, cobranzas, resultado } = body || {};
  if (!/^\d{4}-\d{2}$/.test(mes) || [facturacion, cobranzas, resultado].some((v) => typeof v !== "number")) {
    return NextResponse.json({ error: "Payload inválido: se requiere mes YYYY-MM y facturacion/cobranzas/resultado numéricos" }, { status: 400 });
  }

  const entrada = await setCfoMes(mes, { facturacion, cobranzas, resultado });
  return NextResponse.json({ ok: true, mes, entrada });
}
