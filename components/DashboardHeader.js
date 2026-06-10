"use client";

import { useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import CotizacionHeader from "@/components/CotizacionHeader";
import ThemeSelector from "@/components/ThemeSelector";
import ScoreGlobal from "@/components/ScoreGlobal";

export default function DashboardHeader({ user, isAdmin, companyData, selectedMonthIdx }) {
  const logoRef    = useRef(null);
  const ratesRef   = useRef(null);
  const actionsRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const base = { easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' };
    logoRef.current?.animate(
      [{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'translateX(0)' }],
      { ...base, duration: 480, delay: 0 }
    );
    ratesRef.current?.animate(
      [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { ...base, duration: 480, delay: 80 }
    );
    actionsRef.current?.animate(
      [{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'translateX(0)' }],
      { ...base, duration: 480, delay: 160 }
    );
  }, []);

  return (
    <header className="gradient-bg text-white shadow-lg sticky top-0 z-40">
      <div className="header-grid-overlay" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-[1]">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo */}
          <div ref={logoRef} className="flex items-center space-x-2 sm:space-x-3">
            <Image
              src="/logo_wara.svg"
              alt="Wara GPS"
              width={120}
              height={34}
              className="h-8 sm:h-10 w-auto object-contain drop-shadow-md"
              priority
            />
            <div>
              <span className="text-lg sm:text-2xl font-bold tracking-tight text-white">
                WARA GPS
              </span>
              <p className="hidden sm:block text-xs text-sky-200/70 font-medium">
                Business Intelligence &amp; Finance
              </p>
            </div>
          </div>

          {/* Cotizaciones (hidden on mobile) */}
          <div ref={ratesRef} className="hidden md:flex">
            <CotizacionHeader />
          </div>

          {/* Right side */}
          <div ref={actionsRef} className="flex items-center space-x-2 sm:space-x-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition font-medium"
              >
                <span className="hidden sm:inline">Panel </span>Admin
              </Link>
            )}

            <ScoreGlobal
              companyData={companyData}
              selectedMonthIdx={selectedMonthIdx ?? 0}
              variant="badge"
            />
            <ThemeSelector />

            <div className="flex items-center space-x-2">
              {user.image && (
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-7 h-7 rounded-full border border-white/20"
                />
              )}
              <span className="text-slate-300 text-xs hidden sm:block">
                {user.name}
              </span>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-slate-400 hover:text-white transition px-2 py-2 -mr-1"
              aria-label="Cerrar sesión"
            >
              Salir
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
