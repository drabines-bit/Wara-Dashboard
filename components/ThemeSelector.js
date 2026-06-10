"use client";
import { useState, useEffect, useRef } from 'react';

const THEMES = [
  { id: 'oscuro', label: 'Oscuro',      icon: 'ti-moon',        swatch: '#1e293b' },
  { id: 'negro',  label: 'Negro puro',  icon: 'ti-moon-filled', swatch: '#000000' },
  { id: 'marino', label: 'Marino',      icon: 'ti-anchor',      swatch: '#0c1c3d' },
  { id: 'claro',  label: 'Claro',       icon: 'ti-sun',         swatch: '#f1f5f9' },
];

export default function ThemeSelector() {
  const [theme, setTheme] = useState('oscuro');
  const [open,  setOpen]  = useState(false);
  const ref = useRef(null);

  // Cargar preferencia guardada
  useEffect(() => {
    const saved = localStorage.getItem('wara:theme') ?? 'oscuro';
    setTheme(saved);
    aplicar(saved);
  }, []);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function aplicar(id) {
    document.documentElement.setAttribute('data-theme', id);
    // El tema claro desactiva la clase dark de Tailwind; los demás la activan
    if (id === 'claro') document.documentElement.classList.remove('dark');
    else                document.documentElement.classList.add('dark');
  }

  function elegir(id) {
    setTheme(id);
    localStorage.setItem('wara:theme', id);
    aplicar(id);
    setOpen(false);
  }

  const actual = THEMES.find(t => t.id === theme) ?? THEMES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Cambiar tema"
        aria-label="Cambiar tema del dashboard"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm
                   text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <i className={`ti ${actual.icon} text-base`} aria-hidden="true"/>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-800
                        rounded-xl border border-slate-200 dark:border-slate-700
                        shadow-xl overflow-hidden z-50">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => elegir(t.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm
                          transition-colors text-left ${
                theme === t.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span className="w-4 h-4 rounded-full border border-slate-300
                               dark:border-slate-600 flex-shrink-0"
                    style={{ backgroundColor: t.swatch }}/>
              <span className="flex-1">{t.label}</span>
              {theme === t.id && (
                <i className="ti ti-check text-sm" aria-hidden="true"/>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
