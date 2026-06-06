"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WARA_LOGO_BASE64 } from "@/lib/logo";

const navItems = [
  { href: "/admin",        label: "Inicio"        },
  { href: "/admin/import", label: "Sincronización"  },
  { href: "/admin/config", label: "Configuración"  },
  { href: "/dashboard",    label: "Ver Dashboard"  },
];

export default function AdminNav({ user }) {
  const pathname = usePathname();

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 mr-4">
            <img src={WARA_LOGO_BASE64} alt="Wara GPS" className="h-8 w-auto object-contain" />
            <span className="text-white font-semibold text-sm">Admin</span>
          </div>
          <nav className="flex items-center space-x-1">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm transition font-medium ${
                  pathname === href
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-slate-500 hover:text-slate-300 transition"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
