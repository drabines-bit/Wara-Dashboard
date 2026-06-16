"use client";
// Pantalla intermedia post-login: misión y visión de la empresa con la
// identidad de marca, antes de entrar al dashboard. Reemplaza al video
// de bienvenida y se muestra una vez por sesión de navegador.

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const MISION = `Innovar constantemente, ofreciendo al mercado soluciones integrales
tanto en hardware como en software para la seguridad, el control operativo y la
logística de empresas, organismos públicos y particulares en general.`;

const VISION = `Consolidar a nuestra empresa a nivel latinoamericano como un socio
estratégico de nuestros clientes, valorados y reconocidos por la eficiencia,
nuestra capacidad de innovación y un servicio de nivel mundial.`;

// Cada palabra entra con un fade + blur escalonado a partir de `base` ms
function TextoAnimado({ texto, base }) {
  return texto.split(/\s+/).map((palabra, i) => (
    <span key={i} className="intro-word" style={{ '--word-delay': `${base + i * 16}ms` }}>
      {palabra}&nbsp;
    </span>
  ));
}

export default function IntroScreen({ userName }) {
  const [visible,  setVisible]  = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!sessionStorage.getItem('wara_intro_v1')) {
      setVisible(true);
      sessionStorage.setItem('wara_intro_v1', '1');
    }
  }, []);

  // Bloquear el scroll del dashboard mientras la intro está visible
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  // Gestión de foco del diálogo: foco inicial, Escape/Enter para saltar
  // y trampa de Tab para no tabular hacia el dashboard tapado.
  useEffect(() => {
    if (!visible) return;
    dialogRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape') { entrar(); return; }
      if (e.key === 'Enter' && document.activeElement === dialogRef.current) { entrar(); return; }
      if (e.key !== 'Tab') return;
      const nodes = dialogRef.current?.querySelectorAll('a[href], button:not([disabled])');
      if (!nodes?.length) return;
      const list = Array.from(nodes);
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible]);

  function entrar() {
    setSaliendo(true);
    setTimeout(() => setVisible(false), 500);
  }

  if (!visible) return null;

  const nombre = userName ? userName.split(' ')[0] : null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className={`fixed inset-0 z-50 gradient-bg overflow-y-auto outline-none
                  transition-opacity duration-500 ease-out
                  ${saliendo ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida: misión y visión de Wara GPS"
    >
      <div className="header-grid-overlay" aria-hidden="true" />

      {/* Omitir */}
      <button
        onClick={entrar}
        className="absolute top-5 right-6 z-[2] text-xs font-medium text-slate-400
                   hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5
                   rounded-lg transition-colors"
      >
        Omitir →
      </button>

      <div className="relative z-[1] min-h-full flex flex-col items-center
                      justify-center px-6 py-16 max-w-5xl mx-auto">

        {/* Logo y marca */}
        <div className="intro-stagger flex flex-col items-center text-center" style={{ '--intro-i': 0 }}>
          <Image
            src="/logo_wara.svg"
            alt="Wara GPS"
            width={190}
            height={53}
            className="h-12 sm:h-14 w-auto object-contain drop-shadow-lg"
            priority
          />
          <p className="mt-3 text-sm text-sky-200/70 font-medium tracking-wide">
            Business Intelligence &amp; Finance
          </p>
          <span className="intro-accent-line block mt-6 h-[3px] w-24 rounded-full bg-indigo-500" aria-hidden="true" />
        </div>

        {/* Misión y Visión */}
        <div className="mt-12 grid sm:grid-cols-2 gap-10 sm:gap-0 w-full">
          <div className="intro-stagger sm:pr-10 sm:border-r sm:border-slate-700/60" style={{ '--intro-i': 1 }}>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300 mb-3">
              Misión
            </h2>
            <p className="text-slate-200 text-base sm:text-lg leading-relaxed text-pretty">
              <TextoAnimado texto={MISION} base={350} />
            </p>
          </div>
          <div className="intro-stagger sm:pl-10" style={{ '--intro-i': 2 }}>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300 mb-3">
              Visión
            </h2>
            <p className="text-slate-200 text-base sm:text-lg leading-relaxed text-pretty">
              <TextoAnimado texto={VISION} base={750} />
            </p>
          </div>
        </div>

        {/* Llamado a la acción: entra cuando terminan de escribirse los textos */}
        <div className="intro-stagger mt-14 text-center" style={{ '--intro-i': 7 }}>
          <p className="text-2xl sm:text-3xl font-bold text-white text-balance">
            ¿Qué vamos a hacer hoy{nombre ? `, ${nombre}` : ''}?
          </p>
        </div>

        <div className="intro-stagger mt-8 grid gap-4 md:grid-cols-2 w-full items-stretch"
             style={{ '--intro-i': 8 }}>
          <button
            onClick={entrar}
            className="chip-glow group flex items-center gap-4
                       bg-slate-800/80 hover:bg-slate-800 rounded-2xl px-5 py-5
                       ring-1 ring-slate-700 hover:ring-indigo-400
                       transition-all duration-300 hover:-translate-y-0.5
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span className="flex items-center justify-center w-11 h-11 rounded-xl
                             bg-indigo-600/20 text-indigo-300 flex-shrink-0">
              <i className="ti ti-heart-rate-monitor text-2xl" aria-hidden="true" />
            </span>
            <span className="text-center flex-1">
              <span className="block text-white font-semibold text-base">
                Quiero conocer la salud financiera de WARA
              </span>
              <span className="block text-slate-400 text-xs mt-0.5">
                Indicadores, resultados y liquidez del mes
              </span>
            </span>
            <i className="ti ti-arrow-right text-xl text-indigo-300 ml-2
                          transition-transform duration-300 group-hover:translate-x-1.5"
               aria-hidden="true" />
          </button>

          {/* TODO: convertir en enlace cuando esté definido el destino del panel de operación */}
          <div
            title="Disponible próximamente"
            className="flex items-center gap-4 cursor-default
                       bg-slate-800/50 rounded-2xl px-5 py-5
                       ring-1 ring-slate-700/70"
          >
            <span className="flex items-center justify-center w-11 h-11 rounded-xl
                             bg-sky-600/15 text-sky-300/80 flex-shrink-0">
              <i className="ti ti-route text-2xl" aria-hidden="true" />
            </span>
            <span className="text-center flex-1">
              <span className="block text-slate-300 font-semibold text-base">
                Quiero saber cómo está la operación de la empresa
              </span>
              <span className="block text-slate-500 text-xs mt-0.5">
                Flota, logística y servicio
              </span>
            </span>
            <span className="ml-2 flex-shrink-0 text-[10px] font-bold uppercase tracking-wider
                             text-sky-300/90 bg-sky-500/10 ring-1 ring-sky-500/30
                             px-2.5 py-1 rounded-full">
              Próximamente
            </span>
          </div>

          <a
            href="https://wara.dev/salas/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4
                       bg-slate-800/80 hover:bg-slate-800 rounded-2xl px-5 py-5
                       ring-1 ring-slate-700 hover:ring-teal-400
                       transition-all duration-300 hover:-translate-y-0.5
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <span className="flex items-center justify-center w-11 h-11 rounded-xl
                             bg-teal-600/20 text-teal-300 flex-shrink-0">
              <i className="ti ti-calendar-event text-2xl" aria-hidden="true" />
            </span>
            <span className="text-center flex-1">
              <span className="block text-white font-semibold text-base">
                Quiero reservar una sala de reunión
              </span>
              <span className="block text-slate-400 text-xs mt-0.5">
                Abre wara.dev en una pestaña nueva
              </span>
            </span>
            <i className="ti ti-external-link text-xl text-teal-300 ml-2
                          transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
               aria-hidden="true" />
          </a>

          <a
            href="https://wara-eos.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4
                       bg-slate-800/80 hover:bg-slate-800 rounded-2xl px-5 py-5
                       ring-1 ring-slate-700 hover:ring-fuchsia-400
                       transition-all duration-300 hover:-translate-y-0.5
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
          >
            <span className="flex items-center justify-center w-11 h-11 rounded-xl
                             bg-fuchsia-600/20 text-fuchsia-300 flex-shrink-0">
              <i className="ti ti-target-arrow text-2xl" aria-hidden="true" />
            </span>
            <span className="text-center flex-1">
              <span className="block text-white font-semibold text-base">
                Voy a trabajar con el EOS de WARA
              </span>
              <span className="block text-slate-400 text-xs mt-0.5">
                Abre el sistema EOS en una pestaña nueva
              </span>
            </span>
            <i className="ti ti-external-link text-xl text-fuchsia-300 ml-2
                          transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
               aria-hidden="true" />
          </a>

          <a
            href="https://wara-pagos.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="group md:col-span-2 flex items-center gap-4
                       bg-slate-800/80 hover:bg-slate-800 rounded-2xl px-5 py-5
                       ring-1 ring-slate-700 hover:ring-violet-400
                       transition-all duration-300 hover:-translate-y-0.5
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <span className="flex items-center justify-center w-11 h-11 rounded-xl
                             bg-violet-600/20 text-violet-300 flex-shrink-0">
              <i className="ti ti-receipt text-2xl" aria-hidden="true" />
            </span>
            <span className="text-center flex-1">
              <span className="block text-white font-semibold text-base">
                Quiero revisar el avance de pagos de Wara
              </span>
              <span className="block text-slate-400 text-xs mt-0.5">
                Abre el portal de pagos en una pestaña nueva
              </span>
            </span>
            <i className="ti ti-external-link text-xl text-violet-300 ml-2
                          transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
               aria-hidden="true" />
          </a>
        </div>

        {/* Pie institucional */}
        <p className="intro-stagger mt-14 text-xs text-slate-500" style={{ '--intro-i': 9 }}>
          Blo, Bienestar, Logística y Organización S.A.
        </p>
      </div>
    </div>
  );
}
