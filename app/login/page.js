"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { WARA_LOGO_BASE64 } from "@/lib/logo";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-10 w-full max-w-sm shadow-xl border border-slate-700">
        <div className="flex items-center space-x-3 mb-8">
          <img
            src={WARA_LOGO_BASE64}
            alt="Wara GPS"
            className="h-12 w-auto object-contain"
          />
          <div>
            <h1 className="text-white font-bold text-lg leading-none">WARA GPS</h1>
            <p className="text-slate-400 text-xs">Business Intelligence &amp; Finance</p>
          </div>
        </div>

        <h2 className="text-white text-xl font-semibold mb-2">Acceso restringido</h2>
        <p className="text-slate-400 text-sm mb-8">
          Dashboard de uso interno de Blo S.A. Iniciá sesión con tu cuenta
          de Google de waragps.com o una cuenta autorizada.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center space-x-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.766 12.276c0-.815-.073-1.6-.21-2.352H12.24v4.448h6.482a5.54 5.54 0 0 1-2.403 3.637v3.013h3.89c2.277-2.097 3.557-5.184 3.557-8.746z"/>
            <path fill="#34A853" d="M12.24 24c3.24 0 5.956-1.075 7.942-2.907l-3.89-3.013c-1.078.722-2.457 1.148-4.052 1.148-3.116 0-5.754-2.104-6.696-4.931H1.518v3.111A11.996 11.996 0 0 0 12.24 24z"/>
            <path fill="#FBBC05" d="M5.544 14.297a7.213 7.213 0 0 1 0-4.594V6.592H1.518a11.996 11.996 0 0 0 0 10.816l4.026-3.111z"/>
            <path fill="#EA4335" d="M12.24 4.772c1.762 0 3.344.606 4.587 1.794l3.443-3.443C18.19 1.19 15.476 0 12.24 0A11.996 11.996 0 0 0 1.518 6.592l4.026 3.111c.942-2.827 3.58-4.931 6.696-4.931z"/>
          </svg>
          <span>Continuar con Google</span>
        </button>

        {/* Alternativa temporal durante la transición a Google Workspace */}
        <button
          onClick={() => signIn("github", { callbackUrl })}
          className="w-full mt-3 bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-sm font-medium py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.929.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          <span>Entrar con GitHub</span>
        </button>

        <p className="text-center text-slate-500 text-xs mt-6">
          Solo cuentas autorizadas por Blo S.A.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
