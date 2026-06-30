import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { backtest } from "@/lib/proyeccion/backtest";

const LEADS_VALIDOS = [1, 3, 6];

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const L = Number(searchParams.get("L") ?? 3);
  if (!LEADS_VALIDOS.includes(L)) {
    return NextResponse.json({ error: `L inválido. Debe ser uno de: ${LEADS_VALIDOS.join(", ")}` }, { status: 400 });
  }

  try {
    const resultado = await backtest(L);
    return NextResponse.json(resultado, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
}
