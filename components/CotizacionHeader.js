"use client";
import { useState, useEffect, useCallback } from 'react';

const REFRESH_MS = 10 * 60 * 1000;

function formatARS(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);
}

function formatCLP(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
  }).format(n);
}

function minutosDesde(isoStr) {
  if (!isoStr) return null;
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h}h`;
}

export default function CotizacionHeader() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch('/api/cotizaciones');
      if (res.ok) setData(await res.json());
    } catch { /* mantener último valor */ }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchRates();
    const id = setInterval(fetchRates, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchRates]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        {[0, 1].map(i => (
          <div key={i} className="h-8 w-28 rounded-lg bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const { ars, clp } = data ?? {};

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-1.5 chip-glow"
        title={ars ? `Compra: ${formatARS(ars.compra)} · Actualizado ${minutosDesde(ars.actualizado)}` : 'Sin datos'}
      >
        <span className="text-xs" aria-hidden="true">🇦🇷</span>
        <span className="text-slate-400 text-xs font-medium">ARS</span>
        <span className="text-slate-100 text-sm font-semibold tracking-tight">
          {ars ? formatARS(ars.venta) : '—'}
        </span>
        {ars && (
          <span className="text-slate-600 text-xs hidden sm:inline">venta</span>
        )}
      </div>

      <div
        className="flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-1.5 chip-glow"
        style={{ animationDelay: '2s' }}
        title={clp ? `Dólar observado BCC · Actualizado ${minutosDesde(clp.actualizado)}` : 'Sin datos'}
      >
        <span className="text-xs" aria-hidden="true">🇨🇱</span>
        <span className="text-slate-400 text-xs font-medium">CLP</span>
        <span className="text-slate-100 text-sm font-semibold tracking-tight">
          {clp ? formatCLP(clp.valor) : '—'}
        </span>
        {clp && (
          <span className="text-slate-600 text-xs hidden sm:inline">obs.</span>
        )}
      </div>
    </div>
  );
}
