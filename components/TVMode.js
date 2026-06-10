"use client";
import { useState, useEffect, useMemo } from 'react';
import { WARA_LOGO_BASE64 } from '@/lib/logo';
import { fmtNumber } from '@/lib/format';
import ScoreGlobal from '@/components/ScoreGlobal';

const TV_CARD_REGISTRY = [
  { id: 'scoreGlobal',             label: 'Score Global',          icon: 'ti-gauge'           },
  { id: 'cumplimientoFacturacion', label: 'Cumpl. Facturación',    icon: 'ti-chart-bar'       },
  { id: 'cumplimientoCobranza',    label: 'Cumpl. Cobranza',       icon: 'ti-cash'            },
  { id: 'variacionFacturacion',    label: 'Variación Facturación', icon: 'ti-trending-up'     },
  { id: 'variacionCobranza',       label: 'Variación Cobranza',    icon: 'ti-trending-up'     },
  { id: 'liquidez',                label: 'Ratio Liquidez',        icon: 'ti-droplet'         },
  { id: 'inflacion',               label: 'Inflación INDEC',       icon: 'ti-percentage'      },
  { id: 'dolarOficial',            label: 'Dólar Oficial',         icon: 'ti-currency-dollar' },
  { id: 'dolarMep',                label: 'Dólar MEP',             icon: 'ti-currency-dollar' },
  { id: 'dolarClp',                label: 'CLP',                   icon: 'ti-currency'        },
];

const TV_CARDS_DEFAULT = [
  'scoreGlobal',
  'cumplimientoFacturacion', 'cumplimientoCobranza', 'variacionFacturacion',
  'liquidez', 'inflacion', 'dolarOficial',
];

// ── Semáforo ──────────────────────────────────────────────────────────

function sem(type, val, config) {
  if (val === null || val === undefined)
    return { ring: 'ring-slate-800', glow: '', text: 'text-slate-400', badge: 'bg-slate-900 text-slate-400', label: '–' };
  const s = config?.semaphores ?? {};
  const ok = (type, dfV, dfA) => ({ verde: s[type]?.verde ?? dfV, amarillo: s[type]?.amarillo ?? dfA });
  if (type === 'cumplimiento') {
    const { verde, amarillo } = ok('cumplimiento', 95, 80);
    if (val >= verde)    return { ring: 'ring-emerald-700', glow: 'shadow-emerald-900/30', text: 'text-emerald-300', badge: 'bg-emerald-900/50 text-emerald-200', label: 'Cumple' };
    if (val >= amarillo) return { ring: 'ring-amber-600',   glow: 'shadow-amber-900/30',   text: 'text-amber-300',   badge: 'bg-amber-900/50   text-amber-200',   label: 'Atención' };
    return                      { ring: 'ring-red-700',     glow: 'shadow-red-900/30',     text: 'text-red-300',     badge: 'bg-red-900/50     text-red-200',     label: 'Crítico' };
  }
  if (type === 'variacion') {
    const verde = s.variacion?.verde ?? 5;
    const rojo  = s.variacion?.rojo  ?? -5;
    if (val > verde) return { ring: 'ring-emerald-700', glow: 'shadow-emerald-900/30', text: 'text-emerald-300', badge: 'bg-emerald-900/50 text-emerald-200', label: '▲ Aumento' };
    if (val >= rojo) return { ring: 'ring-amber-600',   glow: 'shadow-amber-900/30',   text: 'text-amber-300',   badge: 'bg-amber-900/50   text-amber-200',   label: '→ Estable' };
    return                  { ring: 'ring-red-700',     glow: 'shadow-red-900/30',     text: 'text-red-300',     badge: 'bg-red-900/50     text-red-200',     label: '▼ Baja' };
  }
  if (type === 'liquidez') {
    const { verde, amarillo } = ok('liquidez', 1.5, 1.0);
    if (val >= verde)    return { ring: 'ring-emerald-700', glow: 'shadow-emerald-900/30', text: 'text-emerald-300', badge: 'bg-emerald-900/50 text-emerald-200', label: 'Solvente' };
    if (val >= amarillo) return { ring: 'ring-amber-600',   glow: 'shadow-amber-900/30',   text: 'text-amber-300',   badge: 'bg-amber-900/50   text-amber-200',   label: 'Atención' };
    return                      { ring: 'ring-red-700',     glow: 'shadow-red-900/30',     text: 'text-red-300',     badge: 'bg-red-900/50     text-red-200',     label: 'Crítico' };
  }
  if (type === 'inflacion') {
    if (val < 3) return { ring: 'ring-emerald-700', glow: '', text: 'text-emerald-300', badge: 'bg-emerald-900/50 text-emerald-200', label: 'Baja' };
    if (val < 6) return { ring: 'ring-amber-600',   glow: '', text: 'text-amber-300',   badge: 'bg-amber-900/50   text-amber-200',   label: 'Moderada' };
    return               { ring: 'ring-red-700',     glow: '', text: 'text-red-300',     badge: 'bg-red-900/50     text-red-200',     label: 'Alta' };
  }
  return { ring: 'ring-indigo-800', glow: '', text: 'text-indigo-300', badge: 'bg-indigo-900/50 text-indigo-200', label: '' };
}

// ── Tarjeta TV ────────────────────────────────────────────────────────

function TVCard({ label, value, badge, semColors, sub, icon }) {
  return (
    <div className={`flex-1 bg-slate-950 rounded-2xl p-6 ring-1 ${semColors.ring}
                     shadow-xl ${semColors.glow} flex flex-col justify-between min-h-0`}
         style={{ position: 'relative', overflow: 'hidden' }}>
      <p className="text-slate-600 text-xs font-bold uppercase tracking-[.2em] mb-2 leading-tight">
        {label}
      </p>
      <p className={`text-[4.5rem] font-black leading-none tracking-tight ${semColors.text}`}>
        {value}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${semColors.badge}`}>
          {badge}
        </span>
        {sub && <span className="text-slate-600 text-xs">{sub}</span>}
      </div>
      {icon && (
        <i
          className={`ti ${icon}`}
          style={{
            position: 'absolute', bottom: '-14px', right: '-4px',
            fontSize: '110px', opacity: 0.07, color: 'white',
            lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────

export default function TVMode({ companyData, config, lastSync, onExit, tvCards = TV_CARDS_DEFAULT }) {
  const [hora,  setHora]  = useState('');
  const [fecha, setFecha] = useState('');
  const [rates, setRates] = useState(null);
  const [macro, setMacro] = useState(null);

  // ── Mes más reciente con datos ─────────────────────────────────────
  const mIdx = useMemo(() => {
    const arr = companyData?.facturacion?.real ?? [];
    return arr.reduce((last, v, i) => (v !== null && typeof v === 'number' ? i : last), 0);
  }, [companyData]);

  const mesNombre = companyData?.months?.[mIdx] ?? '';
  const year      = new Date().getFullYear();

  // ── Reloj (cada minuto) ────────────────────────────────────────────
  useEffect(() => {
    const TZ = 'America/Argentina/Buenos_Aires';
    const tick = () => {
      const now = new Date();
      setHora(now.toLocaleTimeString('es-AR',  { timeZone: TZ, hour: '2-digit', minute: '2-digit' }));
      const f = now.toLocaleDateString('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
      setFecha(f.charAt(0).toUpperCase() + f.slice(1));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Datos externos (cotizaciones + macro, cada 5 min) ──────────────
  useEffect(() => {
    const load = () => Promise.all([
      fetch('/api/cotizaciones').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/macroeconomia').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([r, m]) => { if (r) setRates(r); if (m) setMacro(m); });
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Fullscreen ─────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => document.exitFullscreen?.().catch(() => {});
  }, []);

  // ── ESC ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onExit(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onExit]);

  // ── Avance del mes calendario ──────────────────────────────────────
  const avance = useMemo(() => {
    const now   = new Date();
    const dia   = now.getDate();
    const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const mesLabel = now.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires', month: 'long',
    });
    return { dia, total, pct: (dia / total) * 100, mesLabel };
  }, []);

  // ── Datos financieros del mes ──────────────────────────────────────
  const facCumpl = companyData.facturacion.cumplimiento[mIdx];
  const cobCumpl = companyData.cobranza.cumplimiento[mIdx];
  const facVar   = companyData.facturacion.variacion[mIdx];
  const actC     = companyData.activoCorriente.total[mIdx];
  const pasC     = companyData.pasivoCorriente.total[mIdx];
  const liquidez = actC && pasC && pasC > 0 ? actC / pasC : null;

  const cFact = sem('cumplimiento', facCumpl, config);
  const cCob  = sem('cumplimiento', cobCumpl, config);
  const cVar  = sem('variacion',    facVar,   config);
  const cLiq  = sem('liquidez',     liquidez, config);

  const inflMensual = macro?.inflacion?.mensual ?? null;
  const inflMes     = macro?.inflacion?.mesLabel ?? '';
  const cInfl       = sem('inflacion', inflMensual, config);

  const arsVenta = rates?.ars?.venta ?? null;

  // ── Formato compacto ───────────────────────────────────────────────
  const pct   = (v) => v !== null ? fmtNumber(v, 2) + '%' : '–';
  const ratio = (v) => v !== null ? fmtNumber(v, 2) + 'x' : '–';
  const ars   = (v) => v !== null
    ? '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(v)
    : '–';

  // ── Last sync ──────────────────────────────────────────────────────
  const syncLabel = lastSync
    ? new Date(lastSync).toLocaleDateString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col overflow-hidden select-none">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-4
                      border-b border-slate-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src={WARA_LOGO_BASE64} alt="Wara GPS" className="h-9 w-auto object-contain"/>
          <div>
            <p className="font-black text-sm tracking-widest text-white">WARA GPS</p>
            <p className="text-slate-600 text-xs uppercase tracking-wider">Business Intelligence</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
            Últimos datos · {mesNombre} {year}
          </p>
          {syncLabel && (
            <p className="text-slate-700 text-xs mt-0.5">Importado el {syncLabel}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-widest">En vivo</span>
          </div>
          <p className="text-white font-black text-2xl tabular-nums">{hora}</p>
          <button
            onClick={onExit}
            className="text-slate-700 hover:text-slate-400 transition ml-4"
            title="Salir (ESC)"
          >
            <i className="ti ti-x text-xl" aria-hidden="true"/>
          </button>
        </div>
      </div>

      {/* ── Grid de métricas ─────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-4 flex flex-col gap-4 min-h-0">

        {/* Fila 1: indicadores operativos */}
        <div className="flex gap-4 flex-1 min-h-0">
          {tvCards.includes('scoreGlobal') && (
            <div className="flex-1 bg-slate-950 rounded-2xl p-6 ring-1 ring-slate-800
                            shadow-xl flex flex-col justify-between min-h-0"
                 style={{ position: 'relative', overflow: 'hidden' }}>
              <ScoreGlobal
                companyData={companyData}
                selectedMonthIdx={mIdx}
                variant="tv"
              />
            </div>
          )}
          {tvCards.includes('cumplimientoFacturacion') && (
            <TVCard
              label={`Cumplimiento · ${config?.labels?.facturacion ?? 'Facturación'}`}
              value={pct(facCumpl)}
              badge={cFact.label}
              semColors={cFact}
              icon="ti-chart-bar"
            />
          )}
          {tvCards.includes('cumplimientoCobranza') && (
            <TVCard
              label={`Cumplimiento · ${config?.labels?.cobranza ?? 'Cobranza'}`}
              value={pct(cobCumpl)}
              badge={cCob.label}
              semColors={cCob}
              icon="ti-cash"
            />
          )}
          {tvCards.includes('variacionFacturacion') && (
            <TVCard
              label={`Variación M/M · ${config?.labels?.variacion ?? 'Facturación'}`}
              value={facVar !== null ? (facVar > 0 ? '+' : '') + pct(facVar) : '–'}
              badge={cVar.label}
              semColors={cVar}
              icon="ti-trending-up"
            />
          )}
        </div>

        {/* Fila 2: contexto */}
        <div className="flex gap-4 flex-1 min-h-0">
          {tvCards.includes('liquidez') && (
            <TVCard
              label={`Ratio · ${config?.labels?.liquidez ?? 'Liquidez Corriente'}`}
              value={ratio(liquidez)}
              badge={cLiq.label}
              sub="Activo Cte / Pasivo Cte"
              semColors={cLiq}
              icon="ti-droplet"
            />
          )}
          {tvCards.includes('inflacion') && (
            <TVCard
              label={`Inflación mensual · ${inflMes}`}
              value={pct(inflMensual)}
              badge={cInfl.label}
              sub="Fuente: INDEC"
              semColors={cInfl}
              icon="ti-percentage"
            />
          )}
          {tvCards.includes('dolarOficial') && (
            <TVCard
              label="Dólar oficial · Banco Nación"
              value={ars(arsVenta)}
              badge="venta"
              sub="Tipo de cambio ARS/USD"
              semColors={{
                ring:  'ring-indigo-900',
                glow:  'shadow-indigo-950/50',
                text:  'text-indigo-200',
                badge: 'bg-indigo-900/50 text-indigo-300',
              }}
              icon="ti-currency-dollar"
            />
          )}
        </div>
      </div>

      {/* ── Avance del mes ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-8 pb-4">
        <div className="bg-slate-950 rounded-2xl px-6 py-4 ring-1 ring-slate-900">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              Avance del mes de {avance.mesLabel}
            </p>
            <p className="text-white font-black text-2xl tabular-nums">
              {fmtNumber(avance.pct, 1)}%
            </p>
          </div>
          <div className="relative h-2.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-indigo-600 rounded-full transition-all"
              style={{ width: `${avance.pct}%` }}
            />
          </div>
          <p className="text-slate-700 text-xs mt-2">
            {fecha} · Día {avance.dia} de {avance.total} · Restan {avance.total - avance.dia} días
          </p>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between
                      px-8 py-2 border-t border-slate-950">
        <p className="text-slate-800 text-xs">Blo, Bienestar, Logística y Organización S.A.</p>
        <p className="text-slate-800 text-xs">ESC para salir</p>
      </div>
    </div>
  );
}
