"use client";

import { useState } from "react";
import { fmtCurrency, fmtPercent } from "@/lib/format";

const MESES_ABR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
function labelMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES_ABR[m - 1]} '${String(y).slice(2)}`;
}

const LINEAS = [
  { key: "facturacion", label: "Facturación" },
  { key: "cobranza", label: "Cobranza" },
  { key: "resultado", label: "Resultado" },
];

function Celda({ valor, esPct }) {
  if (valor === null || valor === undefined) return <span className="text-slate-300 dark:text-slate-600">–</span>;
  return esPct
    ? <span className={valor < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>{fmtPercent(valor * 100, 1)}</span>
    : <span>{fmtCurrency(valor)}</span>;
}

function GrupoLinea({ linea, label, filas, abierto, onToggle }) {
  return (
    <div className="mb-4 last:mb-0">
      <button onClick={onToggle} className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <i className={`ti ${abierto ? "ti-chevron-down" : "ti-chevron-right"} text-base`} aria-hidden="true" />
        {label}
      </button>
      {abierto && (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="text-sm w-full">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="pb-2 pr-3 font-medium">Mes</th>
                <th className="pb-2 pr-3 font-medium text-right">Real</th>
                <th className="pb-2 pr-3 font-medium text-right">Modelo</th>
                <th className="pb-2 pr-3 font-medium text-right">CFO</th>
                <th className="pb-2 pr-3 font-medium text-right">Desvío modelo</th>
                <th className="pb-2 font-medium text-right">Desvío CFO</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const l = f.lineas[linea];
                return (
                  <tr key={f.mes} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3 text-slate-500 whitespace-nowrap">{labelMes(f.mes)}</td>
                    <td className="py-1.5 pr-3 text-right font-medium text-slate-700 dark:text-slate-300"><Celda valor={l.real} /></td>
                    <td className="py-1.5 pr-3 text-right text-slate-600 dark:text-slate-400"><Celda valor={l.modelo} /></td>
                    <td className="py-1.5 pr-3 text-right text-slate-600 dark:text-slate-400"><Celda valor={l.cfo} /></td>
                    <td className="py-1.5 pr-3 text-right"><Celda valor={l.desvioModeloPct} esPct /></td>
                    <td className="py-1.5 text-right"><Celda valor={l.desvioCfoPct} esPct /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TablaBacktest({ filas }) {
  const [colapsado, setColapsado] = useState({});
  if (!filas?.length) return null;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-8">
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">Detalle por mes</h2>
      {LINEAS.map(({ key, label }) => (
        <GrupoLinea
          key={key}
          linea={key}
          label={label}
          filas={filas}
          abierto={colapsado[key] !== true}
          onToggle={() => setColapsado((p) => ({ ...p, [key]: !p[key] }))}
        />
      ))}
    </section>
  );
}
