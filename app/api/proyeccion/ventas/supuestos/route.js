import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupuestosVentas, setSupuestoVentas } from "@/lib/proyeccion/ventas";

function requireAdmin(session) {
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  return null;
}

// GET — overrides mensuales de altas/bajas netas { "YYYY-MM": valor }.
export async function GET() {
  const session = await getServerSession(authOptions);
  const denegado = requireAdmin(session);
  if (denegado) return denegado;

  const overrides = await getSupuestosVentas();
  return NextResponse.json({ overrides });
}

// POST — upsert { mes, valor } (override aditivo de unidades netas para ese mes).
export async function POST(req) {
  const session = await getServerSession(authOptions);
  const denegado = requireAdmin(session);
  if (denegado) return denegado;

  const body = await req.json();
  const { mes, valor } = body || {};
  if (!/^\d{4}-\d{2}$/.test(mes) || typeof valor !== "number") {
    return NextResponse.json({ error: "Payload inválido: se requiere mes YYYY-MM y valor numérico" }, { status: 400 });
  }

  await setSupuestoVentas(mes, valor);
  const overrides = await getSupuestosVentas();
  return NextResponse.json({ overrides });
}
