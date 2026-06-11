"use client";
import { useState, useEffect, useCallback } from 'react';
import { fmtCurrency, fmtNumber } from '@/lib/format';

function BarRow({ rank, label, value, maxValue, count }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-2 py-2
                    border-b border-slate-100 dark:border-slate-700 last:border-0">
      <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0 tabular-nums">
        {rank}
      </span>
      <span className="text-sm text-slate-600 dark:text-slate-400 w-28 flex-shrink-0 truncate"
            title={label}>
        {label}
      </span>
      <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
        <div className="h-full bg-indigo-500 rounded transition-all duration-500"
             style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200
                       w-28 text-right flex-shrink-0 tabular-nums">
        {fmtCurrency(value)}
      </span>
      <span className="text-xs text-slate-400 w-14 text-right flex-shrink-0">
        {count} fact.
      </span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <div className="h-72 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"/>
      <div className="h-72 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"/>
    </div>
  );
}

export default function OdooPanel() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/odoo');
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

  if (loading && !data) return <Skeleton />;

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800
                      rounded-2xl p-5 mb-4 flex items-start gap-3">
        <i className="ti ti-alert-circle text-red-500 text-xl flex-shrink-0" aria-hidden="true"/>
        <div>
          <p className="font-semibold text-red-700 dark:text-red-300 text-sm">
            Error al conectar con Odoo
          </p>
          <p className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</p>
          <button onClick={fetchData}
                  className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 underline">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { year, totalFacturado, cantidadFacturas, totalDeuda,
          facturacionPorProvincia, topDeudores, dso } = data;

  const maxProv = facturacionPorProvincia[0]?.total ?? 1;
  const top20Total = topDeudores.reduce((s, d) => s + d.deuda, 0);

  return (
    <div className="mb-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-purple-500" aria-hidden="true"/>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Análisis Comercial · Odoo {year}
          </h3>
          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 dark:bg-purple-950
                           text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full border
                           border-purple-200 dark:border-purple-800">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse inline-block"/>
            En tiempo real
          </span>
          {dso != null && (
            <span
              title="DSO — Days Sales Outstanding: días promedio que tarda la empresa en cobrar. Deuda pendiente dividida por la facturación diaria promedio del año."
              className={`inline-flex items-center gap-1.5 text-xs font-semibold
                          px-2.5 py-1 rounded-full border cursor-help ${
                dso <= 45
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : dso <= 75
                    ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
              }`}
            >
              <i className="ti ti-hourglass text-sm" aria-hidden="true"/>
              DSO: {dso} días
            </span>
          )}
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
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-purple-600 transition
                       flex items-center gap-1 disabled:opacity-50"
          >
            <i className={`ti ti-refresh text-sm ${loading ? 'animate-spin' : ''}`}
               aria-hidden="true"/>
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Facturación por provincia ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100
                        dark:border-slate-700 p-5 shadow-sm">
          <div className="mb-4">
            <h4 className="font-semibold text-slate-800 dark:text-white text-sm">
              Facturación {year} por Provincia
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {fmtCurrency(totalFacturado)} total · {cantidadFacturas} facturas
            </p>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
            {facturacionPorProvincia.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10">
                Sin datos para {year}
              </p>
            ) : (
              facturacionPorProvincia.map((row, i) => (
                <BarRow
                  key={row.provincia}
                  rank={i + 1}
                  label={row.provincia}
                  value={row.total}
                  count={row.cantidad}
                  maxValue={maxProv}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Top 20 Deudores ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100
                        dark:border-slate-700 p-5 shadow-sm">
          <div className="mb-4">
            <h4 className="font-semibold text-slate-800 dark:text-white text-sm">
              Top 20 Deudores
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Deuda total pendiente de cobro: {fmtCurrency(totalDeuda)}
            </p>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left text-xs font-semibold text-slate-400
                                 uppercase tracking-wider pb-2 w-6">#</th>
                  <th className="text-left text-xs font-semibold text-slate-400
                                 uppercase tracking-wider pb-2">Cliente</th>
                  <th className="text-right text-xs font-semibold text-slate-400
                                 uppercase tracking-wider pb-2">Deuda</th>
                </tr>
              </thead>
              <tbody>
                {topDeudores.map((d, i) => (
                  <tr key={i}
                      className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                    <td className="py-2 pr-2 text-slate-400 text-xs tabular-nums">{i + 1}</td>
                    <td className="py-2 pr-3 text-sm text-slate-700 dark:text-slate-300
                                   max-w-0" style={{ maxWidth: '200px' }}>
                      <span className="block truncate" title={d.nombre}>{d.nombre}</span>
                    </td>
                    <td className={`py-2 text-right text-sm font-semibold tabular-nums ${
                      i < 3  ? 'text-red-600   dark:text-red-400'   :
                      i < 8  ? 'text-amber-600 dark:text-amber-400' :
                               'text-slate-700 dark:text-slate-300'
                    }`}>
                      {fmtCurrency(d.deuda)}
                      <span className="text-xs font-normal text-slate-400 ml-1">
                        ({d.facturas ?? 0} fact.)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {topDeudores.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                    <td colSpan={2}
                        className="pt-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total top 20
                    </td>
                    <td className="pt-2 text-right text-sm font-bold
                                   text-slate-800 dark:text-white tabular-nums">
                      {fmtCurrency(top20Total)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
