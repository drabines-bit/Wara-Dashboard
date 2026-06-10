"use client";
import { useState, useEffect } from 'react';
import { calcularScoreGlobal } from '@/lib/scoreGlobal';

const NIVEL_STYLE = {
  verde:    { ring: 'stroke-emerald-500', text: 'text-emerald-600 dark:text-emerald-400',
              bg: 'bg-emerald-50 dark:bg-emerald-950',   border: 'border-emerald-200 dark:border-emerald-800',
              label: 'Saludable' },
  amarillo: { ring: 'stroke-amber-500',   text: 'text-amber-600 dark:text-amber-400',
              bg: 'bg-amber-50 dark:bg-amber-950',       border: 'border-amber-200 dark:border-amber-800',
              label: 'Atención' },
  rojo:     { ring: 'stroke-red-500',     text: 'text-red-600 dark:text-red-400',
              bg: 'bg-red-50 dark:bg-red-950',           border: 'border-red-200 dark:border-red-800',
              label: 'Crítico' },
};

function Gauge({ score, nivel, size = 96 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const st = NIVEL_STYLE[nivel];
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none"
              className="stroke-slate-100 dark:stroke-slate-700" strokeWidth="8"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
              className={st.ring} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}/>
    </svg>
  );
}

export default function ScoreGlobal({ companyData, selectedMonthIdx, variant = 'card' }) {
  const [odooExtra, setOdooExtra] = useState({ dso: null, margenNeto: null });

  useEffect(() => {
    (async () => {
      try {
        const [odooRes, pnlRes] = await Promise.allSettled([
          fetch('/api/odoo'),
          fetch('/api/odoo-pnl'),
        ]);
        const odoo = odooRes.status === 'fulfilled' && odooRes.value.ok
          ? await odooRes.value.json() : null;
        const pnl  = pnlRes.status === 'fulfilled' && pnlRes.value.ok
          ? await pnlRes.value.json() : null;
        setOdooExtra({
          dso:        odoo?.dso ?? null,
          margenNeto: pnl?.resumen?.margenNeto ?? null,
        });
      } catch {}
    })();
  }, []);

  const resultado = calcularScoreGlobal({
    data: companyData,
    mIdx: selectedMonthIdx,
    dso:  odooExtra.dso,
    margenNeto: odooExtra.margenNeto,
  });

  if (!resultado) return null;
  const { score, nivel, indicadores } = resultado;
  const st = NIVEL_STYLE[nivel];

  // ── Variante badge (header) ──────────────────────────────────────
  if (variant === 'badge') {
    return (
      <div
        title={`Score Global del mes: ${score}/100 (${st.label}). Pondera cumplimiento de cobranza y facturación, liquidez, DSO, variación m/m y margen neto.`}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border
                    text-xs font-bold cursor-help ${st.bg} ${st.text} ${st.border}`}
      >
        <span className={`w-2 h-2 rounded-full inline-block ${
          nivel === 'verde' ? 'bg-emerald-500' :
          nivel === 'amarillo' ? 'bg-amber-500' : 'bg-red-500'
        }`}/>
        {score}
      </div>
    );
  }

  // ── Variante tv (Modo TV) ────────────────────────────────────────
  if (variant === 'tv') {
    return (
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', overflow: 'hidden' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                        opacity: 0.5, color: '#fff', fontWeight: 500 }}>
            Score Global · Mes
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.1,
                        color: nivel === 'verde' ? '#4de8a0' :
                               nivel === 'amarillo' ? '#fbbf24' : '#ff7070' }}>
            {score}<span style={{ fontSize: 20, opacity: 0.5 }}>/100</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{st.label}</div>
      </div>
    );
  }

  // ── Variante card (Vista General) ────────────────────────────────
  return (
    <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl border
                    border-slate-100 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center gap-6 flex-wrap">

        {/* Gauge + score */}
        <div className="relative flex-shrink-0">
          <Gauge score={score} nivel={nivel} size={96}/>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${st.text}`}>{score}</span>
            <span className="text-xs text-slate-400">/100</span>
          </div>
        </div>

        {/* Título + nivel */}
        <div className="flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Score Global del Mes
          </h3>
          <span className={`inline-flex items-center gap-1.5 mt-1.5 text-xs font-bold
                            px-2.5 py-1 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
            {st.label}
          </span>
        </div>

        {/* Breakdown de indicadores */}
        <div className="flex-1 min-w-[280px] grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2">
          {indicadores.map(ind => (
            <div key={ind.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 truncate">{ind.label}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300
                                 tabular-nums">
                  {ind.valor}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                  ind.score >= 75 ? 'bg-emerald-500' :
                  ind.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
