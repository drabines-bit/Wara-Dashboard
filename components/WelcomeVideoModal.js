"use client";
import { useState, useEffect, useRef } from "react";

export default function WelcomeVideoModal({ userName }) {
  const [visible, setVisible] = useState(false);
  const [muted,   setMuted]   = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    const visto = sessionStorage.getItem("wara_welcome_v1");
    if (!visto) {
      setVisible(true);
      sessionStorage.setItem("wara_welcome_v1", "1");
    }
  }, []);

  function cerrar() {
    if (videoRef.current) videoRef.current.pause();
    setVisible(false);
  }

  function toggleMute() {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
    >
      <div className="relative w-full max-w-2xl mx-4">

        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <p className="text-white font-bold text-lg leading-tight">
              Bienvenido{userName ? `, ${userName}` : ""} 👋
            </p>
            <p className="text-slate-400 text-sm">Wara GPS · Business Intelligence & Finance</p>
          </div>
          <button
            onClick={cerrar}
            className="text-slate-400 hover:text-white transition text-sm font-medium
                       bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
          >
            Omitir →
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black">
          <video
            ref={videoRef}
            src="/welcome.mp4"
            autoPlay
            muted
            playsInline
            onEnded={cerrar}
            className="w-full block"
            style={{ maxHeight: "70vh" }}
          />

          <div className="absolute bottom-0 left-0 right-0 flex items-center
                          justify-between px-4 py-3
                          bg-gradient-to-t from-black/60 to-transparent">
            <button
              onClick={toggleMute}
              className="text-white text-xs font-medium flex items-center gap-1.5
                         bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition"
              title={muted ? "Activar sonido" : "Silenciar"}
            >
              {muted ? (
                <><i className="ti ti-volume-off text-base" aria-hidden="true"/> Sin sonido</>
              ) : (
                <><i className="ti ti-volume text-base" aria-hidden="true"/> Con sonido</>
              )}
            </button>
            <button
              onClick={cerrar}
              className="text-white text-xs font-medium
                         bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition"
            >
              Ir al dashboard →
            </button>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-3">
          Este mensaje se muestra una vez por sesión.
        </p>
      </div>
    </div>
  );
}
