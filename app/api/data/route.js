import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getDashboardData, setDashboardData, setLastSync } from "@/lib/kv";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const data = await getDashboardData();
  return NextResponse.json({ data });
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
  if (!body.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }
  await setDashboardData(body.data);
  await setLastSync();
  return NextResponse.json({ ok: true });
}
