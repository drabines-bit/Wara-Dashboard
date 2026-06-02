import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDashboardConfig, setDashboardConfig } from "@/lib/kv";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const config = await getDashboardConfig();
  return NextResponse.json({ config });
}

export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.config || typeof body.config !== "object") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
  await setDashboardConfig(body.config);
  return NextResponse.json({ ok: true });
}
