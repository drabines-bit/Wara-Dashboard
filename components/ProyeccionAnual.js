"use client";
import { fmtCurrency, fmtPercent, fmtNumber } from '@/lib/format';

function calcProyeccion(realArr, objetivoArr) {
  const conDatos = (realArr ?? [])
    .map((v, i) => ({ i, v }))
    .filter(({ v }) => v !== null && v !== undefined && typeof v === 'number');

  if (conDatos.length === 0) return null;

  const ytd         = conDatos.reduce((s, { v }) => s + v, 0);
  const promMensual = ytd / conDatos.length;
  const restantes   = 12 - conDatos.length;
  const proyeccion  = ytd + promMensual * restantes;

  const objetivo = (objetivoArr ?? [])
    .filter(v => typeof v === 'number' && v > 0)
    .reduce((s, v) => s + v, 0);

  const cumplimiento = objetivo > 0 ? (proyeccion / objetivo) * 100 : null;
  const gap          = objetivo > 0 ? proyeccion - objetivo : null;
  const ytdPct       = objetivo > 0 ? Math.min((ytd / objetivo) * 100, 100) : 0;
  const proyPct      = objetivo > 0 ? Math.min((proyeccion / objetivo) * 100, 100) : 0;

  return {
    conDatos: conDatos.length,
    restantes,
    ytd,
    promMensual,
    proyeccion,
    objetivo,
    cumplimiento,
    gap,
    ytdPct,
    proyPct,
    addPct: Math.max(proyPct - ytdPct, 0),
  };
}

function ProyCard({ label, labelColor, data }) {
  const {
    conDatos, restantes, ytd, promMensual,
    proyeccion, objetivo, cumplimiento, gap,
    ytdPct, proyPct, addPct,
  } = data;

  const superavit   = gap !== null && gap >= 0;
  const sinObjetivo = objetivo === 0;
  const cumplColor  = !cumplimiento ? 'text-slate-400'
    : cumplimiento >= 95 ? 'text-emerald-500 dark:text-emerald-400'
    : cumplimiento >= 80 ? 'text-amber-500  dark:text-amber-400'
    : 'text-red-500 dark:text-red-400';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100
                    dark:border-slate-700 p-5 shadow-sm flex flex-col gap-4">

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500
                        uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            {fmtCurrency(proyeccion)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Proyección anual</p>
        </div>
        {cumplimiento !== null && (
          <div className="text-right flex-shrink-0">
            <p className={`text-2xl font-bold leading-tight ${cumplColor}`}>
              {fmtNumber(cumplimiento, 1)}%
            </p>
            <p className="text-xs text-slate-400">cumplimiento</p>
            <p className="text-xs text-slate-400">proyectado</p>
          </div>
        )}
      </div>

      {!sinObjetivo && (
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>YTD real: {fmtCurrency(ytd)}</span>
            <span>Objetivo: {fmtCurrency(objetivo)}</span>
          </div>
          <div className="relative h-3.5 bg-slate-100 dark:bg-slate-700
                          rounded-full overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full rounded-l-full ${labelColor}`}
              style={{ width: `${ytdPct}%` }}
            />
            <div
              className="absolute top-0 h-full"
              style={{
                left: `${ytdPct}%`,
                width: `${addPct}%`,
                background: `repeating-linear-gradient(
                  90deg,
                  rgba(99,102,241,0.35) 0px,
                  rgba(99,102,241,0.35) 6px,
                  transparent 6px,
                  transparent 12px
                )`,
              }}
            />
            <div className="absolute top-0 bottom-0 right-0 w-0.5
                            bg-slate-400 dark:bg-slate-500 opacity-60"/>
          </div>
          <div className="flex gap-4 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <span className={`w-2.5 h-2.5 rounded-sm inline-block ${labelColor}`}/>
              Real ({ytdPct.toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-300 dark:bg-indigo-700 inline-block"/>
              Proyectado (+{addPct.toFixed(0)}%)
            </span>
          </div>
        </div>
      )}

      {gap !== null && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
          ${superavit
            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
            : 'bg-red-50    dark:bg-red-950/50    text-red-700    dark:text-red-300'
          }`}>
          <i
            className={`ti ${superavit ? 'ti-trending-up' : 'ti-trending-down'} text-base`}
            aria-hidden="true"
          />
          <span>
            {superavit ? 'Superávit' : 'Déficit'} proyectado:{' '}
            <strong>
              {superavit ? '+' : ''}{fmtCurrency(gap)}
            </strong>
            {' '}vs objetivo anual
          </span>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
        Basado en{' '}
        <strong className="text-slate-500 dark:text-slate-400">{conDatos}</strong>
        {' '}{conDatos === 1 ? 'mes' : 'meses'} reales ·
        Promedio mensual: {fmtCurrency(promMensual)} ·
        Restan {restantes} {restantes === 1 ? 'mes' : 'meses'}
      </p>
    </div>
  );
}

export default function ProyeccionAnual({ companyData, config }) {
  const year     = new Date().getFullYear();
  const factProy = calcProyeccion(
    companyData?.facturacion?.real,
    companyData?.facturacion?.objetivo
  );
  const cobProy  = calcProyeccion(
    companyData?.cobranza?.real,
    companyData?.cobranza?.objetivo
  );

  if (!factProy && !cobProy) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1 h-5 rounded-full bg-indigo-500" aria-hidden="true"/>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Proyección de Cierre Anual {year}
        </h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          · Run rate basado en promedio YTD
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factProy && (
          <ProyCard
            label={config?.labels?.facturacion ?? 'Facturación'}
            labelColor="bg-blue-600"
            data={factProy}
          />
        )}
        {cobProy && (
          <ProyCard
            label={config?.labels?.cobranza ?? 'Cobranza'}
            labelColor="bg-teal-600"
            data={cobProy}
          />
        )}
      </div>
    </div>
  );
}
