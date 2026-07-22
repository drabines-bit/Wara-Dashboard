"use client";
// Menú lateral contraíble con los accesos rápidos de la pantalla de
// bienvenida, disponible en todo momento. Desde acá también se puede
// volver a ver la intro completa (misión, visión y tarjetas).

import { useState, useEffect, useRef } from 'react';

const ACCESOS = [
  {
    titulo: 'Salud financiera de WARA',
    sub: 'Indicadores, resultados y liquidez',
    icono: 'ti-heart-rate-monitor',
    color: 'text-indigo-400 bg-indigo-500/15',
    href: null, // ya estás acá
  },
  {
    titulo: 'Operación de la empresa',
    sub: 'Flota, logística y servicio',
    icono: 'ti-route',
    color: 'text-sky-400 bg-sky-500/15',
    href: 'https://tableroodoo.onrender.com/',
  },
  {
    titulo: 'Estado de Desarrollo',
    sub: 'Próximo dashboard',
    icono: 'ti-code',
    color: 'text-cyan-400 bg-cyan-500/15',
    href: null,
    proximamente: true,
  },
  {
    titulo: 'Reservar sala de reunión',
    sub: 'wara.dev',
    icono: 'ti-calendar-event',
    color: 'text-teal-400 bg-teal-500/15',
    href: 'https://wara.dev/salas/',
  },
  {
    titulo: 'EOS de WARA',
    sub: 'Sistema EOS',
    icono: 'ti-target-arrow',
    color: 'text-fuchsia-400 bg-fuchsia-500/15',
    href: 'https://wara-eos.vercel.app/',
  },
  {
    titulo: 'Avance de pagos',
    sub: 'Portal de pagos',
    icono: 'ti-receipt',
    color: 'text-violet-400 bg-violet-500/15',
    href: 'https://wara-pagos.vercel.app/',
  },
  {
    titulo: 'Gestión Comercial',
    sub: 'Portal comercial',
    icono: 'ti-speakerphone',
    color: 'text-orange-400 bg-orange-500/15',
    href: 'https://wara-mkt.vercel.app',
  },
  {
    titulo: 'Capital Humano',
    sub: 'Wara People',
    icono: 'ti-users',
    color: 'text-blue-400 bg-blue-500/15',
    href: 'https://wara-people.vercel.app/',
  },
];

export default function QuickAccessSidebar() {
  const [abierto, setAbierto] = useState(false);
  const panelRef = useRef(null);

  // Cerrar con Escape o con clic fuera del panel
  useEffect(() => {
    if (!abierto) return;
    function onKey(e) { if (e.key === 'Escape') setAbierto(false); }
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [abierto]);

  function verIntro() {
    setAbierto(false);
    window.dispatchEvent(new CustomEvent('wara:show-intro'));
  }

  return (
    <>
      {/* Manija: siempre visible en el borde izquierdo */}
      <button
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        aria-controls="quick-access-panel"
        title="Accesos rápidos de Wara"
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5
                    rounded-r-xl py-4 px-1.5 shadow-lg transition-all duration-300
                    bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur text-slate-300
                    hover:text-white hover:px-2.5 ring-1 ring-slate-700/60
                    ${abierto ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <i className="ti ti-layout-sidebar-left-expand text-lg" aria-hidden="true"/>
        <span className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ writingMode: 'vertical-rl' }}>
          Accesos
        </span>
      </button>

      {/* Fondo oscurecido en mobile */}
      <div className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden
                       transition-opacity duration-300
                       ${abierto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
           aria-hidden="true"/>

      {/* Panel */}
      <aside
        id="quick-access-panel"
        ref={panelRef}
        aria-label="Accesos rápidos de Wara"
        className={`fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col
                    bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md
                    border-r border-slate-700/60 shadow-2xl
                    transition-transform duration-300 ease-out
                    ${abierto ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/60">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <i className="ti ti-apps text-indigo-400" aria-hidden="true"/>
            ¿Qué vamos a hacer hoy?
          </p>
          <button onClick={() => setAbierto(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="Cerrar accesos rápidos">
            <i className="ti ti-x text-lg" aria-hidden="true"/>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {ACCESOS.map((a) => {
            const inner = (
              <>
                <span className={`flex items-center justify-center w-9 h-9 rounded-lg
                                  flex-shrink-0 ${a.color}`}>
                  <i className={`ti ${a.icono} text-lg`} aria-hidden="true"/>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-200 truncate">
                    {a.titulo}
                  </span>
                  <span className="block text-xs text-slate-500 truncate">{a.sub}</span>
                </span>
                {a.proximamente ? (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-sky-300/90
                                   bg-sky-500/10 ring-1 ring-sky-500/30 px-1.5 py-0.5 rounded-full
                                   flex-shrink-0">
                    Pronto
                  </span>
                ) : a.href ? (
                  <i className="ti ti-external-link text-sm text-slate-500 flex-shrink-0
                                group-hover:text-slate-300 transition-colors" aria-hidden="true"/>
                ) : (
                  <i className="ti ti-check text-sm text-emerald-400 flex-shrink-0"
                     title="Estás en esta sección" aria-hidden="true"/>
                )}
              </>
            );
            const cls = `group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors
                         ${a.proximamente ? 'cursor-default opacity-70' : 'hover:bg-slate-800'}`;
            return a.href ? (
              <a key={a.titulo} href={a.href} target="_blank" rel="noopener noreferrer" className={cls}>
                {inner}
              </a>
            ) : (
              <div key={a.titulo} className={cls}>{inner}</div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700/60">
          <button
            onClick={verIntro}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5
                       text-sm font-medium text-indigo-300 bg-indigo-500/10
                       hover:bg-indigo-500/20 ring-1 ring-indigo-500/30 transition-colors"
          >
            <i className="ti ti-sparkles text-base" aria-hidden="true"/>
            Ver presentación de bienvenida
          </button>
        </div>
      </aside>
    </>
  );
}
