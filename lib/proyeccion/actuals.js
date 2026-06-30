// "Real" del backtesting — reusa los módulos de actuals que el Dashboard ya
// tiene (Facturación/Cobranza vía wara:data, Facturación con fallback a Odoo
// vía cobranzas.js) en vez de recalcularlos desde cero.
import { searchRead } from "@/lib/odoo";
import { getDashboardData } from "@/lib/kv";
import { facturacionRealMes } from "@/lib/proyeccion/cobranzas";
import { baselineCostos } from "@/lib/proyeccion/costos";
import { rangoMes, mesActualAR } from "@/lib/proyeccion/fechas";

export { facturacionRealMes as realFacturacionMes };

// Cobranza real: wara:data.cobranza.real (la misma fuente "Cobranza Total"
// que ya muestra el Dashboard), sincronizada sólo para el año del Sheet en curso.
export async function realCobranzaMes(mes) {
  const anioActual = mesActualAR().slice(0, 4);
  if (!mes.startsWith(anioActual)) return null;
  const data = await getDashboardData();
  const idx = Number(mes.split("-")[1]) - 1;
  const valor = data?.cobranza?.real?.[idx];
  return valor === null || valor === undefined ? null : Number(valor);
}

// Resultado real (P&L) de un mes: ingresos directo de Odoo (mismo dominio que
// usa el módulo P&L existente) menos el baseline de costos ya construido en
// costos.js — no se recalcula la lógica de costos, se reusa tal cual.
async function ingresosMesOdoo(mes) {
  const { desde, hasta } = rangoMes(mes);
  const lineas = await searchRead("account.move.line", [
    ["account_id.internal_group", "=", "income"],
    ["parent_state", "=", "posted"],
    ["date", ">=", desde],
    ["date", "<=", hasta],
  ], ["debit", "credit"], 20000);
  return lineas.reduce((acc, l) => acc + ((l.credit ?? 0) - (l.debit ?? 0)), 0);
}

export async function realResultadoMes(mes) {
  const [ingresos, costos] = await Promise.all([ingresosMesOdoo(mes), baselineCostos(mes)]);
  const gastos = costos.reduce((acc, c) => acc + c.montoBase, 0);
  return ingresos - gastos;
}
