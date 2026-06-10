"use client";
import { useState, useEffect, useCallback } from 'react';
import { fmtCurrency } from '@/lib/format';

const CAT_COLORS = [
  'text-indigo-600 dark:text-indigo-400',
  'text-emerald-600 dark:text-emerald-400',
  'text-amber-600 dark:text-amber-400',
  'text-violet-600 dark:text-violet-400',
  'text-cyan-600 dark:text-cyan-400',
];

export default function FacturacionMixPanel() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/odoo-mix', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error desconocido');
      setData(json);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchData]);

  if (loading && !data)
    return <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse mb-4"/>;

  if (error)
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800
                      rounded-2xl p-5 mb-4 flex items-start gap-3">
        <i className="ti ti-alert-circle text-red-500 text-xl flex-shrink-0" aria-hidden="true"/>
        <div>
          <p className="font-semibold text-red-700 dark:text-red-300 text-sm">
            Error al cargar Análisis de Facturas
          </p>
          <p className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</p>
          <button onClick={fetchData}
                  className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 underline">
            Reintentar
          </button>
        </div>
      </div>
    );

  if (!data) return null;

  const { year, categorias, meses, ytd, ytdTotal } = data;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-emerald-500" aria-hidden="true"/>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Mix de Facturación por Categoría · Odoo {year}
          </h3>
          <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-950
                           text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full
                           border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"/>
            En tiempo real
          </span>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-slate-400">
              {updatedAt.toLocaleTimeString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          )}
          <button onClick={fetchData} disabled={loading}
                  className="text-xs text-slate-500 hover:text-emerald-600 transition
                             flex items-center gap-1 disabled:opacity-50">
            <i className={`ti ti-refresh text-sm ${loading ? 'animate-spin' : ''}`}
               aria-hidden="true"/>
            Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100
                      dark:border-slate-700 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase
                             tracking-wider px-4 py-3 w-14 sticky left-0
                             bg-white dark:bg-slate-800">
                Mes
              </th>
              {categorias.map((cat, i) => (
                <th key={cat}
                    className={`text-right text-xs font-semibold uppercase tracking-wider
                                px-4 py-3 whitespace-nowrap ${CAT_COLORS[i % CAT_COLORS.length]}`}>
                  {cat}
                </th>
              ))}
              <th className="text-right text-xs font-semibold text-slate-600 dark:text-slate-300
                             uppercase tracking-wider px-4 py-3">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {meses.map(m => (
              <tr key={m.mes}
                  className="border-b border-slate-50 dark:border-slate-700/50 last:border-0
                             hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-2.5 text-xs font-semibold text-slate-500
                               dark:text-slate-400 uppercase sticky left-0
                               bg-white dark:bg-slate-800">
                  {m.nombre}
                </td>
                {categorias.map((cat, i) => (
                  <td key={cat}
                      className={`px-4 py-2.5 text-right tabular-nums text-sm ${
                        m.data[cat]
                          ? CAT_COLORS[i % CAT_COLORS.length]
                          : 'text-slate-300 dark:text-slate-600'
                      }`}>
                    {m.data[cat] ? fmtCurrency(m.data[cat]) : '—'}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right tabular-nums text-sm font-semibold
                               text-slate-800 dark:text-white">
                  {fmtCurrency(m.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-slate-600
                           bg-slate-50 dark:bg-slate-700/30">
              <td className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300
                             uppercase tracking-wider sticky left-0
                             bg-slate-50 dark:bg-slate-700/30">
                YTD
              </td>
              {categorias.map((cat, i) => (
                <td key={cat}
                    className={`px-4 py-3 text-right tabular-nums font-bold
                                ${CAT_COLORS[i % CAT_COLORS.length]}`}>
                  {fmtCurrency(ytd[cat] ?? 0)}
                </td>
              ))}
              <td className="px-4 py-3 text-right tabular-nums font-bold
                             text-slate-800 dark:text-white">
                {fmtCurrency(ytdTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
