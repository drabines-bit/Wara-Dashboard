"use client";
import { useState, useEffect } from 'react';

function toEmbedUrl(url) {
  try {
    const u = new URL(url.trim());
    if (!u.hostname.includes('open.spotify.com')) return null;
    const match = u.pathname.match(/\/(playlist|album|track|artist)\/([A-Za-z0-9]+)/);
    if (!match) return null;
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
}

export default function MusicPlayer() {
  const [embedUrl,   setEmbedUrl]   = useState(null);
  const [abierto,    setAbierto]    = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [editando,   setEditando]   = useState(false);
  const [inputUrl,   setInputUrl]   = useState('');
  const [inputErr,   setInputErr]   = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('wara:musicEmbed');
    if (saved) setEmbedUrl(saved);
  }, []);

  function guardar() {
    const embed = toEmbedUrl(inputUrl);
    if (!embed) { setInputErr(true); return; }
    localStorage.setItem('wara:musicEmbed', embed);
    setEmbedUrl(embed);
    setEditando(false);
    setInputErr(false);
    setInputUrl('');
  }

  function quitar() {
    localStorage.removeItem('wara:musicEmbed');
    setEmbedUrl(null);
    setEditando(false);
  }

  return (
    <div className="relative">

      <button
        onClick={() => setAbierto(o => !o)}
        title="Tu música"
        aria-label="Abrir reproductor de música"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm
                    transition-colors ${
          abierto
            ? 'border-green-400 text-green-500 bg-green-50 dark:bg-green-950/30'
            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-green-400 hover:text-green-500'
        }`}
      >
        <i className="ti ti-music text-base" aria-hidden="true"/>
        Música
      </button>

      {abierto && (
        <div className={`absolute bottom-full right-0 mb-3 bg-white dark:bg-slate-800
                        rounded-2xl border border-slate-200 dark:border-slate-700
                        shadow-2xl z-50 ${minimizado ? 'p-1.5' : 'w-80 p-4'}`}>

          {/* Pastilla minimizada: el iframe sigue montado más abajo (oculto con CSS),
              así la música no se corta y el panel deja de tapar el contenido. */}
          {minimizado ? (
            <button
              onClick={() => setMinimizado(false)}
              aria-label="Expandir reproductor"
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium
                         text-slate-500 dark:text-slate-400 hover:text-green-500 transition"
            >
              <i className="ti ti-brand-spotify text-green-500 text-base" aria-hidden="true"/>
              Reproduciendo
              <i className="ti ti-chevron-up text-sm" aria-hidden="true"/>
            </button>
          ) : (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300
                             flex items-center gap-1.5">
              <i className="ti ti-brand-spotify text-green-500 text-base" aria-hidden="true"/>
              Tu música
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimizado(true)}
                      aria-label="Minimizar reproductor"
                      title="Minimizar (la música sigue sonando)"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition px-1">
                <i className="ti ti-minus text-base" aria-hidden="true"/>
              </button>
              <button onClick={() => { setAbierto(false); setMinimizado(false); }}
                      aria-label="Cerrar"
                      title="Cerrar (detiene la música)"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition px-1">
                <i className="ti ti-x text-base" aria-hidden="true"/>
              </button>
            </div>
          </div>
          )}

          {embedUrl && !editando ? (
            <div className={minimizado ? 'hidden' : ''}>
              <iframe
                src={embedUrl}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-xl"
                title="Reproductor de Spotify"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setEditando(true); setInputUrl(''); }}
                        className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200
                                   dark:border-slate-700 text-slate-500 dark:text-slate-400
                                   hover:border-green-400 hover:text-green-500 transition">
                  Cambiar playlist
                </button>
                <button onClick={quitar}
                        className="text-xs py-1.5 px-3 rounded-lg border border-slate-200
                                   dark:border-slate-700 text-slate-400
                                   hover:border-red-300 hover:text-red-500 transition">
                  Quitar
                </button>
              </div>
            </div>
          ) : (
            <div className={minimizado ? 'hidden' : ''}>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mb-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Cómo conectar tu playlist:
                  </span><br/>
                  1. Abrí Spotify y andá a tu playlist favorita<br/>
                  2. Tocá <i className="ti ti-dots" aria-hidden="true"/> →
                     Compartir → Copiar enlace<br/>
                  3. Pegá el enlace acá abajo
                </p>
              </div>

              <input
                type="url"
                placeholder="https://open.spotify.com/playlist/..."
                value={inputUrl}
                onChange={e => { setInputUrl(e.target.value); setInputErr(false); }}
                onKeyDown={e => e.key === 'Enter' && guardar()}
                className={`w-full px-3 py-2 rounded-lg border text-xs
                            bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300
                            focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  inputErr
                    ? 'border-red-400'
                    : 'border-slate-200 dark:border-slate-600'
                }`}
              />
              {inputErr && (
                <p className="text-xs text-red-500 mt-1.5">
                  El enlace debe ser de open.spotify.com (playlist, álbum o canción)
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <button onClick={guardar}
                        disabled={!inputUrl.trim()}
                        className="flex-1 text-xs py-2 rounded-lg bg-green-600
                                   hover:bg-green-700 text-white font-medium
                                   transition disabled:opacity-40">
                  Conectar
                </button>
                {embedUrl && (
                  <button onClick={() => setEditando(false)}
                          className="text-xs py-2 px-3 rounded-lg border border-slate-200
                                     dark:border-slate-700 text-slate-400 transition">
                    Cancelar
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 leading-relaxed">
                <i className="ti ti-info-circle text-xs mr-1" aria-hidden="true"/>
                Tu elección se guarda solo en este navegador. Con sesión de
                Spotify abierta escuchás temas completos; sin sesión, previews
                de 30 segundos.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
