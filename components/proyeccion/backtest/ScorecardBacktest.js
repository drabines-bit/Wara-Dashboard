"use client";

import { fmtPercent } from "@/lib/format";

const NOMBRES = { facturacion: "Facturación", cobranza: "Cobranza", resultado: "Resultado" };

function Metrica({ label, valor, mejor }) {
  if (valor === null || valor === undefined) return <span className="text-slate-400">–</span>;
  return (
    <span className={mejor ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-600 dark:text-slate-300"}>
      {fmtPercent(valor * 100, 1)}
    </span>
  );
}

export default function ScorecardBacktest({ agregados }) {
  if (!agregados) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {Object.entries(agregados).map(([linea, m]) => {
        const hayAmbos = m.mapeModelo !== null && m.mapeCfo !== null;
        const modeloMejor = hayAmbos && m.mapeModelo < m.mapeCfo;
        const cfoMejor = hayAmbos && m.mapeCfo < m.mapeModelo;
        return (
          <div key={linea} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{NOMBRES[linea] ?? linea}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">MAPE modelo ({m.nModelo})</span>
                <Metrica valor={m.mapeModelo} mejor={modeloMejor} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">MAPE CFO ({m.nCfo})</span>
                <Metrica valor={m.mapeCfo} mejor={cfoMejor} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Sesgo modelo</span>
                <span className="text-slate-600 dark:text-slate-300">{m.sesgoModelo !== null ? fmtPercent(m.sesgoModelo * 100, 1) : "–"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sesgo CFO</span>
                <span className="text-slate-600 dark:text-slate-300">{m.sesgoCfo !== null ? fmtPercent(m.sesgoCfo * 100, 1) : "–"}</span>
              </div>
            </div>
            {hayAmbos && (
              <p className="text-xs text-slate-400 mt-3">
                {modeloMejor ? "El modelo proyecta mejor que el CFO." : cfoMejor ? "El CFO proyecta mejor que el modelo." : "Empate entre modelo y CFO."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
