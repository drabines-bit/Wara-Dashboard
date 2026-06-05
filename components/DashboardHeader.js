"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import CotizacionHeader from "@/components/CotizacionHeader";

export default function DashboardHeader({ user, isAdmin }) {
  return (
    <header className="gradient-bg text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Image
              src="/logo_wara.svg"
              alt="Wara GPS"
              width={120}
              height={34}
              className="h-10 w-auto object-contain drop-shadow-md"
              priority
            />
            <div>
              <span className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-sky-200">
                WARA GPS
              </span>
              <p className="text-xs text-sky-300 font-medium tracking-wider uppercase">
                Business Intelligence &amp; Finance
              </p>
            </div>
          </div>

          {/* Cotizaciones (hidden on mobile — visible in MacroContextStrip below) */}
          <div className="hidden md:flex">
            <CotizacionHeader />
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition font-medium"
              >
                Panel Admin
              </Link>
            )}

            <div className="flex items-center space-x-2">
              {user.image && (
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-7 h-7 rounded-full border border-slate-600"
                />
              )}
              <span className="text-slate-300 text-xs hidden sm:block">
                {user.name}
              </span>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
