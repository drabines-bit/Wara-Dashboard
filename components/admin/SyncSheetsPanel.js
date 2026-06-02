"use client";
import { useState } from 'react';

export default function SyncSheetsPanel() {
  const [status, setStatus] = useState(null); // null | 'syncing' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSync() {
    setStatus('syncing');
    setErrorMsg('');
    try {
      const res = await fetch('/api/sync-sheets', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error desconocido');
      setStatus('ok');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Sincronizar desde Google Sheets
          </h2>
          <p className="text-slate-500 text-sm">
            Descarga la última versión del Sheet y actualiza el dashboard automáticamente.
            No es necesario descargar ni subir ningún archivo.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={status === 'syncing'}
          className="ml-6 shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm flex items-center space-x-2"
        >
          {status === 'syncing' ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
              <span>Sincronizando...</span>
            </>
          ) : (
            <span>Sincronizar ahora</span>
          )}
        </button>
      </div>

      {status === 'ok' && (
        <div className="mt-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
          <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">
            ✓ Sincronización exitosa — el dashboard ya muestra los datos actualizados.
          </p>
          <a href="/dashboard" className="text-emerald-600 text-sm underline mt-1 inline-block">
            Ver dashboard →
          </a>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <p className="text-red-700 dark:text-red-300 text-sm font-medium">✗ {errorMsg}</p>
          <p className="text-red-600 dark:text-red-400 text-xs mt-1">
            Verificá que la service account tiene acceso Viewer al Sheet y que las variables GOOGLE_* están configuradas en Vercel.
          </p>
        </div>
      )}
    </div>
  );
}
