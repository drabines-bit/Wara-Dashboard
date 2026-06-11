"use client";
import { useState, useEffect, useRef } from 'react';

const MAX_CHARS = 600;

export default function NotaMensual({
  nota: notaInicial,
  mes,
  mesNombre,
  year,
  isAdmin,
  onSaved,
}) {
  const [editando,  setEditando]  = useState(false);
  const [texto,     setTexto]     = useState(notaInicial ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);
  const [ok,        setOk]        = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setTexto(notaInicial ?? '');
    setEditando(false);
    setError(null);
    setOk(false);
  }, [mes, notaInicial]);

  useEffect(() => {
    if (editando && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = texto.length;
    }
  }, [editando]);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch('/api/notas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, mes, texto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar');
      setEditando(false);
      setOk(true);
      onSaved?.(mes, texto);
      setTimeout(() => setOk(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    setTexto(notaInicial ?? '');
    setEditando(false);
    setError(null);
  }

  const tieneNota = !!texto?.trim();

  if (!isAdmin && !tieneNota) return null;

  // ── Modo lectura ─────────────────────────────────────────────────────

  if (!editando) {
    return (
      <div className={`mb-5 rounded-2xl border px-5 py-4 transition-all
        ${tieneNota
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
          : 'bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-200 dark:border-slate-700'
        }`}>
        <div className="flex items-start justify-between gap-3">

          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <i
              className={`ti ti-notes text-lg flex-shrink-0 mt-0.5
                ${tieneNota ? 'text-amber-500' : 'text-slate-400'}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1
                ${tieneNota ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                {tieneNota ? `Nota · ${mesNombre}` : `Sin nota para ${mesNombre}`}
              </p>
              {tieneNota ? (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {texto}
                </p>
              ) : isAdmin ? (
                <p className="text-sm text-slate-400 italic">
                  Hacé clic en "Agregar" para documentar este período.
                </p>
              ) : null}
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setEditando(true)}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium
                         text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400
                         bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                         hover:border-indigo-300 px-3 py-1.5 rounded-lg transition"
            >
              <i className={`ti ${tieneNota ? 'ti-edit' : 'ti-plus'} text-sm`} aria-hidden="true"/>
              {tieneNota ? 'Editar' : 'Agregar'}
            </button>
          )}
        </div>

        {ok && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
            <i className="ti ti-check text-sm" aria-hidden="true"/>
            Nota guardada correctamente
          </p>
        )}
      </div>
    );
  }

  // ── Modo edición ─────────────────────────────────────────────────────

  return (
    <div className="mb-5 rounded-2xl border border-indigo-200 dark:border-indigo-700
                    bg-indigo-50/50 dark:bg-indigo-950/30 px-5 py-4">

      <div className="flex items-center gap-2 mb-3">
        <i className="ti ti-notes text-indigo-500 text-lg" aria-hidden="true"/>
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          Nota · {mesNombre}
        </p>
      </div>

      <textarea
        ref={textareaRef}
        value={texto}
        onChange={e => setTexto(e.target.value.slice(0, MAX_CHARS))}
        placeholder={`Documentá lo que pasó en ${mesNombre}: causas de desvíos, decisiones tomadas, hechos relevantes...`}
        rows={4}
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700
                   rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200
                   placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                   resize-none leading-relaxed"
      />

      <div className="flex items-center justify-between mt-2">
        <span className={`text-xs ${texto.length > MAX_CHARS * 0.9
          ? 'text-amber-500' : 'text-slate-400'}`}>
          {texto.length}/{MAX_CHARS} caracteres
        </span>
        <div className="flex items-center gap-2">
          {error && (
            <p className="text-xs text-red-500 mr-2">{error}</p>
          )}
          <button
            onClick={cancelar}
            disabled={guardando}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-1.5
                       rounded-lg transition disabled:opacity-50"
          >
            Cancelar
          </button>
          {tieneNota && (
            <button
              onClick={() => { setTexto(''); }}
              disabled={guardando}
              className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5
                         rounded-lg transition disabled:opacity-50"
              title="Eliminar nota"
            >
              Eliminar
            </button>
          )}
          <button
            onClick={guardar}
            disabled={guardando}
            className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700
                       disabled:bg-indigo-400 text-white px-4 py-1.5 rounded-lg transition
                       flex items-center gap-1.5"
          >
            {guardando && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent
                               rounded-full animate-spin inline-block"/>
            )}
            {guardando ? 'Guardando...' : 'Guardar nota'}
          </button>
        </div>
      </div>
    </div>
  );
}
