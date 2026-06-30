import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProyectos, upsertProyecto, eliminarProyecto } from "@/lib/proyeccion/ventas";

function requireAdmin(session) {
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const denegado = requireAdmin(session);
  if (denegado) return denegado;

  const proyectos = await getProyectos();
  return NextResponse.json({ proyectos });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const denegado = requireAdmin(session);
  if (denegado) return denegado;

  const body = await req.json();
  const { id, nombre, monto, fechaFacturacion } = body || {};
  if (typeof nombre !== "string" || !nombre.trim()
    || typeof monto !== "number"
    || typeof fechaFacturacion !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFacturacion)) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const proyecto = { id: id || `py_${Date.now()}`, nombre: nombre.trim(), monto, fechaFacturacion };
  const proyectos = await upsertProyecto(proyecto);
  return NextResponse.json({ proyectos });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  const denegado = requireAdmin(session);
  if (denegado) return denegado;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el parámetro id" }, { status: 400 });

  const proyectos = await eliminarProyecto(id);
  return NextResponse.json({ proyectos });
}
