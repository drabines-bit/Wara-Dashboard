import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cuentasConClasificacion, setTipoCuenta, setOverrideCosto } from "@/lib/proyeccion/costos";

function requireAdmin(session) {
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  return null;
}

const TIPOS_VALIDOS = ["fijo", "var_unidades", "pct_facturacion"];

// GET — cuentas del baseline (último mes cerrado) + su tipo efectivo (mapeo o default).
export async function GET() {
  const session = await getServerSession(authOptions);
  const denegado = requireAdmin(session);
  if (denegado) return denegado;

  const cuentas = await cuentasConClasificacion();
  return NextResponse.json({ cuentas });
}

// POST — clasificar una cuenta { accountId, tipo, nombre }, o cargar un
// override de costo fijo { accountId, mes, monto } (escalón aditivo).
export async function POST(req) {
  const session = await getServerSession(authOptions);
  const denegado = requireAdmin(session);
  if (denegado) return denegado;

  const body = await req.json();
  const { accountId, tipo, nombre, mes, monto } = body || {};
  if (!accountId) {
    return NextResponse.json({ error: "Falta accountId" }, { status: 400 });
  }

  if (tipo !== undefined) {
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ error: `Tipo inválido. Debe ser: ${TIPOS_VALIDOS.join(", ")}` }, { status: 400 });
    }
    await setTipoCuenta(accountId, tipo, nombre);
  }

  if (mes !== undefined) {
    if (!/^\d{4}-\d{2}$/.test(mes) || typeof monto !== "number") {
      return NextResponse.json({ error: "Override inválido: se requiere mes YYYY-MM y monto numérico" }, { status: 400 });
    }
    await setOverrideCosto(accountId, mes, monto);
  }

  const cuentas = await cuentasConClasificacion();
  return NextResponse.json({ cuentas });
}
