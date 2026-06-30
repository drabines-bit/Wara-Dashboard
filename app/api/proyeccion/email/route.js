import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { enviarReporteProyeccion } from "@/lib/proyeccion/email";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const body = await req.json();
  try {
    await enviarReporteProyeccion(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[proyeccion/email]", err);
    return NextResponse.json({ error: err.message ?? "Error al enviar el email" }, { status: 500 });
  }
}
