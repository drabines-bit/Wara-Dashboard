import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { obtenerProyeccionCompleta } from "@/lib/proyeccion/orquestador";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const proyeccion = await obtenerProyeccionCompleta(18);
    return NextResponse.json(proyeccion, {
      headers: { "Cache-Control": "private, max-age=21600" },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
}
