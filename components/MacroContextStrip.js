"use client";
import { useState, useEffect } from 'react';

function colorInflacion(v) {
  if (v === null || v === undefined) return 'text-slate-400';
  if (v < 3)  return 'text-emerald-500 dark:text-emerald-400';
  if (v < 6)  return 'text-amber-500 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}
function bgInflacion(v) {
  if (v === null || v === undefined) return 'bg-slate-100 dark:bg-slate-700';
  if (v < 3)  return 'bg-emerald-50 dark:bg-emerald-950';
  if (v < 6)  return 'bg-amber-50 dark:bg-amber-950';
  return 'bg-red-50 dark:bg-red-950';
}

function Pill({ icon, label, value, sub, color, bg, tooltip }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100
                  dark:border-slate-700 bg-white dark:bg-slate-800 ${bg}`}
      title={tooltip}
    >
      <div className={`text-2xl flex-shrink-0 ${color}`}>
        <i className={`ti ${icon}`} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight truncate">
          {label}
        </p>
        <p className={`text-lg font-bold leading-tight ${color}`}>{value}</p>
        {sub && (
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight truncate">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MacroContextStrip() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/macroeconomia')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { inflacion, bcra } = data;

  const fmt1 = v => v != null
    ? new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(v) + '%'
    : '–';

  const tendIcon = inflacion?.tendencia === 'sube' ? '↑'
                 : inflacion?.tendencia === 'baja' ? '↓' : '→';

  return (
    <div className="mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        <Pill
          icon="ti-trending-up"
          label={`Inflación mensual · ${inflacion?.mesLabel ?? '–'}`}
          value={fmt1(inflacion?.mensual)}
          sub={`${tendIcon} ${inflacion?.tendencia ?? ''} vs mes anterior`}
          color={colorInflacion(inflacion?.mensual)}
          bg={bgInflacion(inflacion?.mensual)}
          tooltip="IPC mensual · Fuente: INDEC vía argentinadatos.com"
        />

        <Pill
          icon="ti-calendar-stats"
          label={`Inflación acumulada ${new Date().getFullYear()}`}
          value={fmt1(inflacion?.ytd)}
          sub="Interés compuesto desde enero"
          color={colorInflacion((inflacion?.ytd ?? 0) / 12)}
          bg="bg-white dark:bg-slate-800"
          tooltip="Suma compuesta de inflación mensual del año en curso · Fuente: INDEC"
        />

        <Pill
          icon="ti-building-bank"
          label="Tasa de política monetaria BCRA"
          value={bcra ? `${fmt1(bcra.tna)} TNA` : '–'}
          sub={bcra ? `≈ ${fmt1(bcra.tem)} TEM` : 'Sin datos'}
          color="text-indigo-600 dark:text-indigo-400"
          bg="bg-white dark:bg-slate-800"
          tooltip="Tasa de política monetaria (TNA) · Fuente: BCRA"
        />
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-600 mt-2 text-right">
        Fuentes: INDEC · Banco Central de la República Argentina · Actualizado cada 6hs
      </p>
    </div>
  );
}
