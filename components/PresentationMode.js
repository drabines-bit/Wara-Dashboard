"use client";
import { useEffect, useState } from 'react';
import { fmtCurrency, fmtPercent, fmtNumber } from '@/lib/format';
import { WARA_LOGO_BASE64 } from '@/lib/logo';

// ── Semáforo local ────────────────────────────────────────────────────

function sem(type, val, config) {
  if (val === null || val === undefined) {
    return { ring: 'ring-slate-700', text: 'text-slate-400', badge: 'bg-slate-800 text-slate-300' };
  }
  const s = config?.semaphores ?? {};
  let ok, warn;
  if (type === 'cumplimiento') {
    ({ verde: ok = 95, amarillo: warn = 80 } = s.cumplimiento ?? {});
    const pass = val >= ok, near = val >= warn;
    return pass
      ? { ring:'ring-emerald-700', text:'text-emerald-300', badge:'bg-emerald-900/60 text-emerald-200' }
      : near
      ? { ring:'ring-amber-700',   text:'text-amber-300',   badge:'bg-amber-900/60   text-amber-200'   }
      : { ring:'ring-red-800',     text:'text-red-300',     badge:'bg-red-900/60     text-red-200'     };
  }
  if (type === 'variacion') {
    ({ verde: ok = 5, rojo: warn = -5 } = s.variacion ?? {});
    return val > ok
      ? { ring:'ring-emerald-700', text:'text-emerald-300', badge:'bg-emerald-900/60 text-emerald-200' }
      : val >= warn
      ? { ring:'ring-amber-700',   text:'text-amber-300',   badge:'bg-amber-900/60   text-amber-200'   }
      : { ring:'ring-red-800',     text:'text-red-300',     badge:'bg-red-900/60     text-red-200'     };
  }
  if (type === 'liquidez') {
    ({ verde: ok = 1.5, amarillo: warn = 1.0 } = s.liquidez ?? {});
    return val >= ok
      ? { ring:'ring-emerald-700', text:'text-emerald-300', badge:'bg-emerald-900/60 text-emerald-200' }
      : val >= warn
      ? { ring:'ring-amber-700',   text:'text-amber-300',   badge:'bg-amber-900/60   text-amber-200'   }
      : { ring:'ring-red-800',     text:'text-red-300',     badge:'bg-red-900/60     text-red-200'     };
  }
  return { ring:'ring-slate-700', text:'text-slate-400', badge:'bg-slate-800 text-slate-300' };
}

// ── Tarjeta KPI de presentación ───────────────────────────────────────

function PKpi({ label, value, sub, badge, semColors }) {
  return (
    <div className={`flex-1 bg-slate-900 rounded-2xl p-6 ring-1 ${semColors.ring} flex flex-col gap-2`}>
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{label}</p>
      <p className={`text-5xl font-bold leading-none ${semColors.text}`}>{value ?? '–'}</p>
      {sub  && <p className="text-slate-500 text-sm">{sub}</p>}
      {badge && (
        <span className={`self-start mt-1 px-3 py-1 rounded-full text-xs font-bold ${semColors.badge}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Barra de progreso ─────────────────────────────────────────────────

function PBar({ label, real, objetivo, cumplimiento, semColors }) {
  if (real === null || objetivo === null || !objetivo) return null;
  const pct = Math.min((real / objetivo) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-sm text-slate-400 mb-2">
        <span className="font-medium text-slate-200">{label}</span>
        <span className={`font-bold ${semColors.text}`}>{fmtNumber(cumplimiento, 2)}%</span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            cumplimiento >= 95 ? 'bg-emerald-500' : cumplimiento >= 80 ? 'bg-amber-400' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>{fmtCurrency(real)}</span>
        <span>Meta: {fmtCurrency(objetivo)}</span>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────

export default function PresentationMode({
  companyData, config, selectedMonthIdx, setSelectedMonthIdx, notas, year, onExit,
}) {
  const months    = companyData?.months ?? [];
  const mIdx      = selectedMonthIdx;
  const mesNombre = months[mIdx] ?? '';
  const [horaActual, setHoraActual] = useState('');

  useEffect(() => {
    const tick = () => setHoraActual(
      new Date().toLocaleTimeString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: '2-digit', minute: '2-digit',
      })
    );
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { document.exitFullscreen?.().catch(() => {}); };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape')     onExit();
      if (e.key === 'ArrowLeft')  setSelectedMonthIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setSelectedMonthIdx(i => Math.min(11, i + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const facReal  = companyData.facturacion.real[mIdx];
  const facObj   = companyData.facturacion.objetivo[mIdx];
  const facCumpl = companyData.facturacion.cumplimiento[mIdx];
  const facVar   = companyData.facturacion.variacion[mIdx];
  const cobReal  = companyData.cobranza.real[mIdx];
  const cobObj   = companyData.cobranza.objetivo[mIdx];
  const cobCumpl = companyData.cobranza.cumplimiento[mIdx];
  const actC     = companyData.activoCorriente.total[mIdx];
  const pasC     = companyData.pasivoCorriente.total[mIdx];
  const liquidez = actC && pasC && pasC > 0 ? actC / pasC : null;
  const nota     = notas?.[String(mIdx)] ?? null;

  const cFact = sem('cumplimiento', facCumpl, config);
  const cCob  = sem('cumplimiento', cobCumpl, config);
  const cVar  = sem('variacion',    facVar,   config);
  const cLiq  = sem('liquidez',     liquidez, config);

  const customKPIs = (config?.customVariables ?? []).filter(cv => cv.enabled && cv.showAsKPI);

  const realArr   = companyData.facturacion.real ?? [];
  const conDatos  = realArr.filter(v => typeof v === 'number' && v !== null);
  const ytd       = conDatos.reduce((s, v) => s + v, 0);
  const prom      = conDatos.length > 0 ? ytd / conDatos.length : 0;
  const restant   = 12 - conDatos.length;
  const proyAnual = ytd + prom * restant;
  const objAnual  = (companyData.facturacion.objetivo ?? [])
    .filter(v => typeof v === 'number' && v > 0).reduce((s, v) => s + v, 0);
  const proyPct   = objAnual > 0 ? ((proyAnual / objAnual) * 100).toFixed(1) : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-4
                      border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src={WARA_LOGO_BASE64} alt="Wara GPS" className="h-8 w-auto object-contain"/>
          <div>
            <p className="font-bold text-sm text-white leading-none">WARA GPS</p>
            <p className="text-slate-500 text-xs">Business Intelligence &amp; Finance</p>
          </div>
        </div>

        {/* Navegación de meses */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => setSelectedMonthIdx(i => Math.max(0, i - 1))}
            disabled={mIdx === 0}
            className="text-slate-400 hover:text-white disabled:opacity-20
                       text-2xl w-10 h-10 flex items-center justify-center
                       rounded-xl hover:bg-slate-800 transition"
            title="Mes anterior (←)"
          >
            ‹
          </button>
          <div className="text-center w-44">
            <p className="text-2xl font-bold">{mesNombre} {year}</p>
            <p className="text-slate-500 text-xs">Reporte del período</p>
          </div>
          <button
            onClick={() => setSelectedMonthIdx(i => Math.min(11, i + 1))}
            disabled={mIdx === 11}
            className="text-slate-400 hover:text-white disabled:opacity-20
                       text-2xl w-10 h-10 flex items-center justify-center
                       rounded-xl hover:bg-slate-800 transition"
            title="Mes siguiente (→)"
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-slate-500 text-sm tabular-nums">{horaActual}</p>
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white
                       border border-slate-700 hover:border-slate-500
                       px-4 py-2 rounded-xl transition"
            title="Salir (ESC)"
          >
            <i className="ti ti-arrows-minimize text-base" aria-hidden="true"/>
            Salir
          </button>
        </div>
      </div>

      {/* ── Contenido scrolleable ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

        {/* KPI cards principales */}
        <div className="flex gap-4">
          <PKpi
            label={config?.labels?.facturacion ?? 'Facturación Real'}
            value={fmtCurrency(facReal)}
            sub={`Objetivo: ${fmtCurrency(facObj)}`}
            badge={facCumpl !== null ? `${fmtNumber(facCumpl, 2)}% cumplimiento` : null}
            semColors={cFact}
          />
          <PKpi
            label={config?.labels?.cobranza ?? 'Cobranza Real'}
            value={fmtCurrency(cobReal)}
            sub={`Objetivo: ${fmtCurrency(cobObj)}`}
            badge={cobCumpl !== null ? `${fmtNumber(cobCumpl, 2)}% cumplimiento` : null}
            semColors={cCob}
          />
          <PKpi
            label={config?.labels?.variacion ?? 'Variación M/M Facturación'}
            value={facVar !== null ? fmtPercent(facVar) : '–'}
            sub="Vs. mes anterior"
            badge={facVar !== null ? (facVar > 0 ? '▲ Aumento' : facVar < 0 ? '▼ Descenso' : '→ Estable') : null}
            semColors={cVar}
          />
          <PKpi
            label={config?.labels?.liquidez ?? 'Ratio Liquidez Corriente'}
            value={liquidez !== null ? `${fmtNumber(liquidez, 2)}x` : '–'}
            sub="Activo Cte / Pasivo Cte"
            badge={liquidez !== null
              ? (liquidez >= (config?.semaphores?.liquidez?.verde ?? 1.5) ? 'Solvente'
                : liquidez >= (config?.semaphores?.liquidez?.amarillo ?? 1.0) ? 'Atención'
                : 'Crítico')
              : null}
            semColors={cLiq}
          />
        </div>

        {/* Custom KPIs */}
        {customKPIs.length > 0 && (
          <div className="flex gap-4">
            {customKPIs.map(cv => {
              const val = companyData.custom?.[cv.id]?.[mIdx] ?? null;
              return (
                <PKpi
                  key={cv.id}
                  label={cv.displayName}
                  value={
                    val === null ? '–'
                    : cv.dataType === 'currency' ? fmtCurrency(val)
                    : cv.dataType === 'percent'  ? fmtPercent(val)
                    : fmtNumber(val)
                  }
                  semColors={{ ring:'ring-indigo-800', text:'text-indigo-300', badge:'bg-indigo-900/60 text-indigo-200' }}
                />
              );
            })}
          </div>
        )}

        {/* Progreso + Proyección */}
        <div className="grid grid-cols-2 gap-6">

          {/* Barras de cumplimiento */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-5">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
              Análisis Operativo · {mesNombre}
            </p>
            <PBar
              label={config?.labels?.facturacion ?? 'Facturación'}
              real={facReal} objetivo={facObj} cumplimiento={facCumpl} semColors={cFact}
            />
            <PBar
              label={config?.labels?.cobranza ?? 'Cobranza'}
              real={cobReal} objetivo={cobObj} cumplimiento={cobCumpl} semColors={cCob}
            />
          </div>

          {/* Proyección anual */}
          {conDatos.length > 0 && objAnual > 0 && (
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">
                Proyección Cierre {year}
              </p>
              <p className="text-4xl font-bold text-white leading-none mb-1">
                {fmtCurrency(proyAnual)}
              </p>
              <p className="text-slate-500 text-sm mb-4">
                Proyección anual de facturación
              </p>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${
                    proyAnual >= objAnual ? 'bg-emerald-500'
                    : proyAnual >= objAnual * 0.8 ? 'bg-amber-400' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((proyAnual / objAnual) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{fmtCurrency(proyAnual)}</span>
                <span>Objetivo: {fmtCurrency(objAnual)}</span>
              </div>
              {proyPct && (
                <p className={`mt-3 text-lg font-bold ${
                  proyAnual >= objAnual ? 'text-emerald-400'
                  : proyAnual >= objAnual * 0.8 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {proyPct}% del objetivo anual
                </p>
              )}
              <p className="text-slate-600 text-xs mt-2">
                Basado en {conDatos.length} meses · Promedio: {fmtCurrency(prom)}/mes
              </p>
            </div>
          )}
        </div>

        {/* Nota del período */}
        {nota && (
          <div className="bg-amber-950/40 border border-amber-800/50 rounded-2xl px-6 py-4
                          flex items-start gap-3">
            <i className="ti ti-notes text-amber-400 text-xl flex-shrink-0 mt-0.5" aria-hidden="true"/>
            <div>
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Nota del período · {mesNombre}
              </p>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{nota}</p>
            </div>
          </div>
        )}

      </div>

      {/* ── Pie: atajos de teclado ────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-center gap-6
                      py-2 border-t border-slate-900 text-xs text-slate-700">
        <span><kbd className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">←</kbd> mes anterior</span>
        <span><kbd className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">→</kbd> mes siguiente</span>
        <span><kbd className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">ESC</kbd> salir</span>
      </div>
    </div>
  );
}
