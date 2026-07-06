"use client";
// Análisis de costos sobre ventas: ranking de cuentas de costo/gasto del P&L
// de Odoo según su participación en los ingresos YTD, destacando las que
// superan el umbral crítico para análisis posterior.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fmtCurrency } from '@/lib/format';

// Umbral de participación sobre ventas que marca un costo como crítico.
// Debe mantenerse alineado con el usado en PnlPanel.
const UMBRAL_PCT = 15;

const GRUPOS = {
  expense_direct_cost:  { label: 'Costo de ventas',  chip: 'bg-rose-500/10 text-rose-500 ring-rose-500/25' },
  expense:              { label: 'Gasto operativo',  chip: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/25' },
  expense_depreciation: { label: 'Depreciación',     chip: 'bg-slate-500/10 text-slate-400 ring-slate-500/25' },
};

function StatTile({ label, value, sub, tone = '' }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${
        tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-white'
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CostAnalysisPanel() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [grupo,   setGrupo]   = useState('todos');

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/odoo-pnl');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error desconocido');
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const modelo = useMemo(() => {
    if (!data) return null;
    const ventas = data.resumen?.ingresos ?? 0;
    if (ventas <= 0) return { ventas, costos: [], criticos: [], totalCostos: 0, escala: 100 };

    const costos = data.cuentas
      .filter(c => GRUPOS[c.tipo] && c.monto > 0)
      .map(c => ({ ...c, pct: (c.monto / ventas) * 100 }))
      .sort((a, b) => b.pct - a.pct);

    const totalCostos = costos.reduce((s, c) => s + c.monto, 0);
    const criticos = costos.filter(c => c.pct > UMBRAL_PCT);
    // Escala común para todas las barras, con aire sobre el máximo y
    // asegurando que el umbral quede siempre visible dentro del eje
    const maxPct = Math.max(...costos.map(c => c.pct), UMBRAL_PCT);
    const escala = Math.ceil((maxPct * 1.15) / 5) * 5;

    return { ventas, costos, criticos, totalCostos, escala };
  }, [data]);

  if (loading && !data)
    return <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"/>;

  if (error)
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800
                      rounded-2xl p-5 flex items-start gap-3">
        <i className="ti ti-alert-circle text-red-500 text-xl flex-shrink-0" aria-hidden="true"/>
        <div>
          <p className="font-semibold text-red-700 dark:text-red-300 text-sm">
            Error al cargar el P&L desde Odoo
          </p>
          <p className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</p>
          <button onClick={fetchData}
                  className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 underline">
            Reintentar
          </button>
        </div>
      </div>
    );

  if (!modelo) return null;
  const { ventas, costos, criticos, totalCostos, escala } = modelo;
  const visibles = grupo === 'todos' ? costos : costos.filter(c => c.tipo === grupo);
  const umbralPos = (UMBRAL_PCT / escala) * 100;
  const top5Pct = costos.slice(0, 5).reduce((s, c) => s + c.pct, 0);

  return (
    <div className="space-y-6">

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Ventas YTD" value={fmtCurrency(ventas)} sub={`Odoo ${data.year}`} />
        <StatTile label="Costos y gastos totales" value={fmtCurrency(totalCostos)}
                  sub={ventas > 0 ? `${((totalCostos / ventas) * 100).toFixed(1)}% de las ventas` : ''} />
        <StatTile label={`Costos > ${UMBRAL_PCT}% de ventas`} value={criticos.length}
                  sub={criticos.length > 0 ? 'requieren análisis' : 'ninguno supera el umbral'}
                  tone={criticos.length > 0 ? 'warn' : ''} />
        <StatTile label="Concentración top 5" value={`${top5Pct.toFixed(1)}%`}
                  sub="de las ventas se va en 5 cuentas" />
      </div>

      {/* Costos críticos */}
      {criticos.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40
                        rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <i className="ti ti-alert-triangle text-amber-500 text-lg" aria-hidden="true"/>
            <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              Costos críticos: superan el {UMBRAL_PCT}% de las ventas
            </h4>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {criticos.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 bg-white/60
                                         dark:bg-slate-900/40 rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    <span className="font-mono text-xs text-slate-400 mr-1.5">{c.codigo}</span>
                    {c.nombre}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {GRUPOS[c.tipo].label} · {fmtCurrency(c.monto)}
                  </p>
                </div>
                <span className="text-base font-bold tabular-nums text-amber-600 dark:text-amber-400
                                 flex-shrink-0">
                  {c.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking con barras de participación */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100
                      dark:border-slate-700 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h4 className="font-semibold text-slate-800 dark:text-white text-sm">
            Participación de cada costo sobre las ventas
          </h4>
          <div className="flex items-center gap-1 text-xs">
            {[['todos', 'Todos'], ...Object.entries(GRUPOS).map(([k, v]) => [k, v.label])].map(([k, lbl]) => (
              <button key={k} onClick={() => setGrupo(k)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        grupo === k
                          ? 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 ring-1 ring-indigo-500/30'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {visibles.map(c => {
            const excede = c.pct > UMBRAL_PCT;
            return (
              <div key={c.id} className="group grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center
                                         gap-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30
                                         px-2 -mx-2 transition-colors">
                <div className="min-w-0 text-xs text-slate-600 dark:text-slate-300 truncate"
                     title={`${c.codigo} ${c.nombre}`}>
                  <span className="font-mono text-slate-400 mr-1.5">{c.codigo}</span>
                  {c.nombre}
                  <span className={`ml-2 hidden lg:inline-flex text-[10px] px-1.5 py-px rounded-md
                                    ring-1 ${GRUPOS[c.tipo].chip}`}>
                    {GRUPOS[c.tipo].label}
                  </span>
                </div>
                <div className="relative h-4 rounded-md bg-slate-100 dark:bg-slate-700/40 overflow-hidden">
                  <div className={`absolute inset-y-0 left-0 rounded-r
                                   ${excede ? 'bg-amber-500' : 'bg-indigo-500/80'}`}
                       style={{ width: `${Math.min((c.pct / escala) * 100, 100)}%` }}/>
                  {/* Marca del umbral */}
                  <div className="absolute inset-y-0 w-px bg-slate-400/70 dark:bg-slate-300/50"
                       style={{ left: `${umbralPos}%` }} aria-hidden="true"/>
                </div>
                <div className="flex items-center gap-2 justify-end w-40 flex-shrink-0">
                  <span className="text-[11px] text-slate-400 tabular-nums hidden sm:inline">
                    {fmtCurrency(c.monto)}
                  </span>
                  <span className={`text-xs font-semibold tabular-nums w-12 text-right ${
                    excede ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'
                  }`}>
                    {c.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
          {visibles.length === 0 && (
            <p className="text-sm text-slate-400 py-6 text-center">
              No hay cuentas con movimientos en este grupo.
            </p>
          )}
        </div>

        <p className="text-[11px] text-slate-400 mt-4 flex items-center gap-1.5">
          <span className="inline-block w-px h-3 bg-slate-400/70" aria-hidden="true"/>
          La línea vertical marca el umbral del {UMBRAL_PCT}% sobre ventas.
          Escala del eje: 0–{escala}%.
        </p>
      </div>
    </div>
  );
}
