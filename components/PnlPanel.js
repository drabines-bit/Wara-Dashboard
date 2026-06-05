"use client";
import { useState, useEffect, useCallback } from 'react';
import { fmtCurrency } from '@/lib/format';

const INCOME_TYPES = ['income', 'income_other'];
const COGS_TYPES   = ['expense_direct_cost'];
const OPEX_TYPES   = ['expense'];
const DEPR_TYPES   = ['expense_depreciation'];

function SectionRow({ label, amount, expanded, onToggle, colorClass = '' }) {
  return (
    <tr
      className="bg-slate-50 dark:bg-slate-700/40 cursor-pointer select-none"
      onClick={onToggle}
    >
      <td className="py-2 pl-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        <i className={`ti ${expanded ? 'ti-chevron-down' : 'ti-chevron-right'} text-xs mr-1.5`}
           aria-hidden="true"/>
        {label}
      </td>
      <td className={`py-2 pr-3 text-right text-sm font-semibold tabular-nums ${colorClass}`}>
        {fmtCurrency(amount)}
      </td>
    </tr>
  );
}

function AccountRow({ cuenta }) {
  return (
    <tr className="border-b border-slate-50 dark:border-slate-700/30 last:border-0">
      <td className="py-1.5 pl-8 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-mono text-slate-400 mr-1.5">{cuenta.codigo}</span>
        {cuenta.nombre}
      </td>
      <td className="py-1.5 pr-3 text-right text-xs text-slate-600 dark:text-slate-400 tabular-nums">
        {fmtCurrency(cuenta.monto)}
      </td>
    </tr>
  );
}

function TotalRow({ label, amount, size = 'base', border = false }) {
  const isPos = amount >= 0;
  return (
    <tr className={border ? 'border-t-2 border-slate-200 dark:border-slate-600' : ''}>
      <td className={`py-2.5 pl-3 font-semibold text-slate-800 dark:text-white text-${size}`}>
        {label}
      </td>
      <td className={`py-2.5 pr-3 text-right font-bold tabular-nums text-${size} ${
        isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}>
        {fmtCurrency(amount)}
      </td>
    </tr>
  );
}

export default function PnlPanel() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [expanded,  setExpanded]  = useState({
    ingresos: false, costos: false, gastos: false, depreciaciones: false,
  });

  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/odoo-pnl');
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
    return <div className="h-52 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse mb-4"/>;

  if (error)
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800
                      rounded-2xl p-5 mb-4 flex items-start gap-3">
        <i className="ti ti-alert-circle text-red-500 text-xl flex-shrink-0" aria-hidden="true"/>
        <div>
          <p className="font-semibold text-red-700 dark:text-red-300 text-sm">
            Error al cargar P&L desde Odoo
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

  const { year, resumen, cuentas, mensual } = data;
  const maxIngreso = Math.max(...mensual.map(m => m.ingresos), 1);

  const porTipo = (tipos) => cuentas.filter(c => tipos.includes(c.tipo));

  return (
    <div className="mb-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-violet-500" aria-hidden="true"/>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Profit & Loss · Odoo {year}
          </h3>
          <span className="inline-flex items-center gap-1 text-xs bg-violet-50 dark:bg-violet-950
                           text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full
                           border border-violet-200 dark:border-violet-800">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse inline-block"/>
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
                  className="text-xs text-slate-500 hover:text-violet-600 transition
                             flex items-center gap-1 disabled:opacity-50">
            <i className={`ti ti-refresh text-sm ${loading ? 'animate-spin' : ''}`}
               aria-hidden="true"/>
            Actualizar
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          {
            label: 'Ingresos YTD',
            value: resumen.ingresos,
            sub:   `${mensual.length} ${mensual.length === 1 ? 'mes' : 'meses'}`,
            color: '',
          },
          {
            label: 'Resultado bruto',
            value: resumen.resultadoBruto,
            sub:   `Margen ${resumen.margenBruto.toFixed(1)}%`,
            color: resumen.resultadoBruto >= 0 ? 'pos' : 'neg',
          },
          {
            label: 'Gastos operativos',
            value: resumen.gastosOperativos,
            sub:   resumen.ingresos > 0
              ? `${((resumen.gastosOperativos / resumen.ingresos) * 100).toFixed(1)}% s/ ingresos`
              : '—',
            color: '',
          },
          {
            label: 'Resultado neto',
            value: resumen.resultadoNeto,
            sub:   `Margen ${resumen.margenNeto.toFixed(1)}%`,
            color: resumen.resultadoNeto >= 0 ? 'pos' : 'neg',
          },
        ].map((kpi, i) => (
          <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{kpi.label}</p>
            <p className={`text-lg font-semibold tabular-nums ${
              kpi.color === 'pos' ? 'text-emerald-600 dark:text-emerald-400' :
              kpi.color === 'neg' ? 'text-red-600 dark:text-red-400' :
              'text-slate-800 dark:text-white'
            }`}>
              {fmtCurrency(kpi.value)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Gráfico mensual */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100
                        dark:border-slate-700 p-5 shadow-sm">
          <h4 className="font-semibold text-slate-800 dark:text-white text-sm mb-4">
            Evolución mensual
          </h4>
          <div className="space-y-2">
            {mensual.map(m => {
              const neto = m.ingresos - m.costoVentas - m.gastosOperativos - m.depreciaciones;
              return (
                <div key={m.mes} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-8 text-right flex-shrink-0 capitalize">
                    {m.nombre}
                  </span>
                  <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded transition-all duration-500"
                      style={{ width: `${(m.ingresos / maxIngreso) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300
                                   w-24 text-right tabular-nums flex-shrink-0">
                    {fmtCurrency(m.ingresos)}
                  </span>
                  <span className={`text-xs w-20 text-right tabular-nums flex-shrink-0 ${
                    neto >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {fmtCurrency(neto)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-3 rounded bg-violet-500 inline-block"/>
              Ingresos
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"/>
              Resultado neto
            </span>
          </div>
        </div>

        {/* Estado de resultados */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100
                        dark:border-slate-700 p-5 shadow-sm">
          <h4 className="font-semibold text-slate-800 dark:text-white text-sm mb-4">
            Estado de resultados YTD
          </h4>
          <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
            <table className="w-full">
              <tbody>

                <SectionRow
                  label="Ingresos"
                  amount={resumen.ingresos}
                  expanded={expanded.ingresos}
                  onToggle={() => toggle('ingresos')}
                />
                {expanded.ingresos && porTipo(INCOME_TYPES).map(c => <AccountRow key={c.id} cuenta={c}/>)}

                <SectionRow
                  label="− Costo de ventas"
                  amount={resumen.costoVentas}
                  expanded={expanded.costos}
                  onToggle={() => toggle('costos')}
                  colorClass="text-red-600 dark:text-red-400"
                />
                {expanded.costos && porTipo(COGS_TYPES).map(c => <AccountRow key={c.id} cuenta={c}/>)}

                <TotalRow label="Resultado bruto" amount={resumen.resultadoBruto} border />

                <SectionRow
                  label="− Gastos operativos"
                  amount={resumen.gastosOperativos}
                  expanded={expanded.gastos}
                  onToggle={() => toggle('gastos')}
                  colorClass="text-red-600 dark:text-red-400"
                />
                {expanded.gastos && porTipo(OPEX_TYPES).map(c => <AccountRow key={c.id} cuenta={c}/>)}

                {resumen.depreciaciones > 0 && (
                  <>
                    <SectionRow
                      label="− Depreciaciones"
                      amount={resumen.depreciaciones}
                      expanded={expanded.depreciaciones}
                      onToggle={() => toggle('depreciaciones')}
                      colorClass="text-red-600 dark:text-red-400"
                    />
                    {expanded.depreciaciones &&
                      porTipo(DEPR_TYPES).map(c => <AccountRow key={c.id} cuenta={c}/>)}
                  </>
                )}

                <TotalRow label="Resultado neto" amount={resumen.resultadoNeto}
                          size="base" border />

              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
