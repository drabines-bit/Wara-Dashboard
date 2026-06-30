import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { proyectarCostos } from "@/lib/proyeccion/costos";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const detalle = await proyectarCostos();
  return NextResponse.json({ detalle }, {
    headers: { "Cache-Control": "private, max-age=21600" },
  });
}
