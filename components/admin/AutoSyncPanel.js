"use client";
import { useState, useEffect } from 'react';

const INTERVALOS = [
  { label: 'Cada 1 hora',   hours: 1  },
  { label: 'Cada 2 horas',  hours: 2  },
  { label: 'Cada 4 horas',  hours: 4  },
  { label: 'Cada 6 horas',  hours: 6  },
  { label: 'Cada 12 horas', hours: 12 },
  { label: 'Cada 24 horas', hours: 24 },
  { label: 'Cada 48 horas', hours: 48 },
];

function fmtDateTime(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AutoSyncPanel() {
  const [enabled,     setEnabled]     = useState(false);
  const [hours,       setHours]       = useState(6);
  const [scheduleId,  setScheduleId]  = useState(null);
  const [activatedAt, setActivatedAt] = useState(null);
  const [lastStatus,  setLastStatus]  = useState(null);
  const [status,      setStatus]      = useState(null);
  const [errorMsg,    setErrorMsg]    = useState('');

  useEffect(() => {
    fetch('/api/auto-sync')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const cfg = d.autoSync ?? {};
        setEnabled(cfg.enabled      ?? false);
        setHours(cfg.intervalHours  ?? 6);
        setScheduleId(cfg.scheduleId   ?? null);
        setActivatedAt(cfg.activatedAt ?? null);
        setLastStatus(d.lastStatus     ?? null);
      })
      .catch(() => {});
  }, []);

  async function activar() {
    setStatus('saving'); setErrorMsg('');
    try {
      const res  = await fetch('/api/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalHours: hours }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido');
      setEnabled(true);
      setScheduleId(data.scheduleId);
      setActivatedAt(new Date().toISOString());
      setStatus('ok');
      setTimeout(() => setStatus(null), 4000);
    } catch (e) { setErrorMsg(e.message); setStatus('error'); }
  }

  async function desactivar() {
    setStatus('saving'); setErrorMsg('');
    try {
      const res = await fetch('/api/auto-sync', { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al desactivar');
      setEnabled(false); setScheduleId(null);
      setStatus('ok');
      setTimeout(() => setStatus(null), 4000);
    } catch (e) { setErrorMsg(e.message); setStatus('error'); }
  }

  const labelActual = INTERVALOS.find(i => i.hours === hours)?.label ?? '';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6
                    border border-slate-200 dark:border-slate-700 shadow-sm mb-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Sincronización automática
          </h2>
          <p className="text-slate-500 text-sm">
            El dashboard se actualiza desde Google Sheets al intervalo elegido,
            sin intervención manual.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0
            ${enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}
          />
          <span className={`text-sm font-medium
            ${enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
            {enabled ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      </div>

      {/* Selector de intervalo */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400
                      uppercase tracking-wider mb-2">
          Intervalo de actualización
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERVALOS.map(({ label, hours: h }) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              disabled={enabled}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
                ${hours === h
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {label}
            </button>
          ))}
        </div>
        {enabled && (
          <p className="text-xs text-slate-400 mt-1.5">
            Para cambiar el intervalo, desactivá primero la sincronización.
          </p>
        )}
      </div>

      {/* Estado de última sync automática */}
      {lastStatus && (
        <div className={`mb-4 flex items-start gap-2 text-xs rounded-lg px-3 py-2
          ${lastStatus.success
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-red-50    dark:bg-red-950/30     text-red-700    dark:text-red-300'}`}>
          <i className={`ti ${lastStatus.success ? 'ti-check' : 'ti-x'} text-sm flex-shrink-0 mt-0.5`}
             aria-hidden="true"/>
          <span>
            Última sync automática: <strong>{fmtDateTime(lastStatus.lastRun)}</strong>
            {!lastStatus.success && ` · Error: ${lastStatus.error}`}
          </span>
        </div>
      )}

      {/* Info si está activa */}
      {enabled && activatedAt && (
        <div className="mb-4 text-xs text-slate-400">
          Activa desde {fmtDateTime(activatedAt)} · {labelActual}
          {scheduleId && (
            <span className="ml-2 font-mono text-slate-500">({scheduleId.slice(0, 18)}…)</span>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-3 flex-wrap">
        {status === 'ok' && (
          <span className="text-emerald-600 dark:text-emerald-400 text-sm">
            ✓ {enabled ? `Activada · ${labelActual}` : 'Desactivada correctamente'}
          </span>
        )}
        {status === 'error' && (
          <span className="text-red-600 dark:text-red-400 text-sm">✗ {errorMsg}</span>
        )}

        {!enabled ? (
          <button
            onClick={activar}
            disabled={status === 'saving'}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
                       disabled:bg-indigo-400 text-white font-semibold
                       px-5 py-2 rounded-xl text-sm transition"
          >
            {status === 'saving' && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            )}
            Activar · {labelActual}
          </button>
        ) : (
          <button
            onClick={desactivar}
            disabled={status === 'saving'}
            className="flex items-center gap-2 border border-red-300 dark:border-red-700
                       text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950
                       font-medium px-5 py-2 rounded-xl text-sm transition"
          >
            {status === 'saving' && (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
            )}
            Desactivar
          </button>
        )}
      </div>

      {/* Info box */}
      <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3
                      text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
        <i className="ti ti-info-circle text-sm flex-shrink-0 mt-0.5" aria-hidden="true"/>
        <span>
          Usa <strong>QStash (Upstash)</strong> para ejecutar la sync en segundo plano.
          QStash llama a{' '}
          <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">/api/sync-sheets</code>{' '}
          al intervalo configurado. Si la sync falla, QStash reintenta automáticamente.
          El estado de cada ejecución queda registrado arriba.
        </span>
      </div>
    </div>
  );
}
