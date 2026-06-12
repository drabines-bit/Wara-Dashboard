"use client";
// Botón flotante para volver al inicio de la página. Aparece recién
// cuando el usuario scrolleó lo suficiente como para perder el header de vista.

import { useState, useEffect } from 'react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVisible(window.scrollY > 600));
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  function subir() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <button
      onClick={subir}
      aria-label="Volver al inicio de la página"
      title="Volver arriba"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full
                  flex items-center justify-center
                  bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300
                  border border-slate-200 dark:border-slate-700 shadow-lg
                  hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400
                  hover:-translate-y-0.5 transition-all duration-300
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                  ${visible ? 'opacity-100' : 'opacity-0 translate-y-2 pointer-events-none'}`}
    >
      <i className="ti ti-arrow-up text-xl" aria-hidden="true" />
    </button>
  );
}
