"use client";

import { useState } from "react";
import { fmtCurrency } from "@/lib/format";

const MESES_ABR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function labelMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES_ABR[m - 1]} '${String(y).slice(2)}`;
}

const FILAS_DEVENGADO = [
  { key: "facturacionNeta", label: "Facturación neta",          get: (d) => d.facturacionNeta, bold: true },
  { key: "abonos",          label: "Abonos",                     get: (d) => d.facturacionMix?.abonos, indent: true },
  { key: "instalaciones",   label: "Instalaciones",               get: (d) => d.facturacionMix?.instalaciones, indent: true },
  { key: "otrosMix",        label: "Otros",                       get: (d) => d.facturacionMix?.otros, indent: true },
  { key: "proyectosMix",    label: "Proyectos",                   get: (d) => d.facturacionMix?.proyectos, indent: true },
  { key: "costosFijos",     label: "Costos fijos",               get: (d) => d.costos.fijos },
  { key: "costosVariables", label: "Costos variables (unidades)", get: (d) => d.costos.variables },
  { key: "costosIibb",      label: "IIBB (% facturación)",        get: (d) => d.costos.iibb },
  { key: "costosTotal",     label: "Costos totales",              get: (d) => d.costos.total, bold: true },
  { key: "resultadoDevengado", label: "Resultado devengado", get: (d) => d.resultadoDevengado, bold: true, destacado: true },
];

const FILAS_CAJA = [
  { key: "cobranzaConIva", label: "Cobranza (con IVA)", get: (d) => d.cobranzaConIva, bold: true },
  { key: "ivaPasante",     label: "IVA cobrado (pasante)", get: (d) => d.ivaPasante },
  { key: "egresos",        label: "Egresos (costos)",     get: (d) => d.egresos },
  { key: "impuestos",      label: "Impuestos (IVA/Ganancias)", pendiente: true },
  { key: "cajaOperativa",  label: "Caja operativa", get: (d) => d.cajaOperativa, bold: true, destacado: true },
];

// Suma una fila a lo largo de todos los meses de un año dentro de la ventana.
function sumarAnio(detalle, getFn, anio) {
  return detalle
    .filter((d) => d.mes.startsWith(anio))
    .reduce((acc, d) => acc + (getFn(d) ?? 0), 0);
}

function Grupo({ titulo, filas, detalle, columnas, abierto, onToggle }) {
  return (
    <div className="mb-6 last:mb-0">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        <i className={`ti ${abierto ? "ti-chevron-down" : "ti-chevron-right"} text-base`} aria-hidden="true" />
        {titulo}
      </button>
      {abierto && (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white dark:bg-slate-900 text-left px-3 py-2 font-medium text-slate-500 z-10 min-w-[190px]" />
                {columnas.map((c, i) => (
                  <th
                    key={i}
                    className={`px-3 py-2 text-right font-medium whitespace-nowrap ${
                      c.tipo === "subtotal"
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {c.tipo === "mes" ? labelMes(c.mes) : `Subtotal ${c.anio}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.key} className="border-t border-slate-100 dark:border-slate-800">
                  <td
                    className={`sticky left-0 bg-white dark:bg-slate-900 py-2 whitespace-nowrap z-10 ${
                      f.indent ? "pl-6 pr-3 text-xs" : "px-3"
                    } ${f.bold ? "font-semibold text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}
                  >
                    {f.label}
                  </td>
                  {columnas.map((c, i) => {
                    if (f.pendiente) {
                      return (
                        <td key={i} className={`px-3 py-2 text-right ${c.tipo === "subtotal" ? "bg-slate-50 dark:bg-slate-800/60" : ""}`}>
                          <span className="italic text-slate-400 dark:text-slate-500 text-xs">pendiente</span>
                        </td>
                      );
                    }
                    const valor = c.tipo === "mes" ? f.get(c.data) : sumarAnio(detalle, f.get, c.anio);
                    const colorDestacado = f.destacado
                      ? valor < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-700 dark:text-slate-300";
                    return (
                      <td
                        key={i}
                        className={`px-3 py-2 text-right whitespace-nowrap tabular-nums ${colorDestacado} ${f.bold ? "font-semibold" : ""} ${
                          f.indent ? "text-xs" : ""
                        } ${c.tipo === "subtotal" ? "bg-slate-50 dark:bg-slate-800/60 font-medium" : ""}`}
                      >
                        {fmtCurrency(valor)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TablaProyeccion({ detalle, subtotalesAnuales }) {
  const [colapsado, setColapsado] = useState({});

  if (!detalle?.length) return null;

  const columnas = [];
  for (const fila of detalle) {
    columnas.push({ tipo: "mes", mes: fila.mes, data: fila });
    if (fila.esCierreFiscal) {
      const anio = (subtotalesAnuales ?? []).find((s) => s.hasta === fila.mes)?.anio ?? fila.mes.slice(0, 4);
      columnas.push({ tipo: "subtotal", anio });
    }
  }

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-8">
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Proyección — 18 meses</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Dos lentes: lo devengado (P&amp;L) y lo efectivamente cobrado/pagado (caja). Los cierres de diciembre muestran un subtotal anual.
      </p>
      <Grupo
        titulo="P&L Devengado"
        filas={FILAS_DEVENGADO}
        detalle={detalle}
        columnas={columnas}
        abierto={colapsado.devengado !== true}
        onToggle={() => setColapsado((p) => ({ ...p, devengado: !p.devengado }))}
      />
      <Grupo
        titulo="Caja"
        filas={FILAS_CAJA}
        detalle={detalle}
        columnas={columnas}
        abierto={colapsado.caja !== true}
        onToggle={() => setColapsado((p) => ({ ...p, caja: !p.caja }))}
      />
    </section>
  );
}
