"use client";

import { useEffect, useState } from "react";
import ScorecardBacktest from "@/components/proyeccion/backtest/ScorecardBacktest";
import GraficoBacktest from "@/components/proyeccion/backtest/GraficoBacktest";
import TablaBacktest from "@/components/proyeccion/backtest/TablaBacktest";

const LEADS = [1, 3, 6];

export default function BacktestClient() {
  const [L, setL] = useState(3);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    fetch(`/api/proyeccion/backtest?L=${L}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);
        if (activo) setData(json);
      })
      .catch((e) => { if (activo) setError(e.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [L]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-slate-500 dark:text-slate-400">Lead de la proyección:</span>
        {LEADS.map((l) => (
          <button
            key={l}
            onClick={() => setL(l)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              L === l
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {l} mes{l === 1 ? "" : "es"}
          </button>
        ))}
      </div>

      {cargando && <p className="text-sm text-slate-400 py-12 text-center">Calculando backtest…</p>}

      {error && !cargando && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!cargando && !error && data && data.filas.length === 0 && (
        <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-6 text-center">
          Aún sin snapshots suficientes para el lead elegido ({L} {L === 1 ? "mes" : "meses"}). A medida que corra el cron mensual de
          snapshots, este lead va a tener datos para comparar.
        </div>
      )}

      {!cargando && !error && data && data.filas.length > 0 && (
        <>
          <ScorecardBacktest agregados={data.agregados} />
          <GraficoBacktest filas={data.filas} />
          <TablaBacktest filas={data.filas} />
        </>
      )}
    </div>
  );
}
