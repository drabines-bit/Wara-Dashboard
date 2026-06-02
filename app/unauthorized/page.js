"use client";
import { signOut } from "next-auth/react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-10 w-full max-w-sm shadow-xl border border-slate-700 text-center">
        <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-red-400 text-2xl">✕</span>
        </div>
        <h1 className="text-white font-bold text-xl mb-2">Acceso no autorizado</h1>
        <p className="text-slate-400 text-sm mb-8">
          Tu cuenta de GitHub no tiene permisos para acceder a este dashboard.
          Contactá al administrador de Wara GPS.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 px-4 rounded-xl transition text-sm"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
