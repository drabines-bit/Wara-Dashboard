"use client";
import { useState } from "react";

const LINK_DEFS = [
  { key: "web",        icon: "ti-world",            label: "Sitio web",  bg: "#dbeafe", color: "#1d4ed8", section: "social" },
  { key: "instagram",  icon: "ti-brand-instagram",  label: "Instagram",  bg: "#fce7f3", color: "#9d174d", section: "social" },
  { key: "linkedin",   icon: "ti-brand-linkedin",   label: "LinkedIn",   bg: "#dbeafe", color: "#1e40af", section: "social" },
  { key: "facebook",   icon: "ti-brand-facebook",   label: "Facebook",   bg: "#ede9fe", color: "#4c1d95", section: "social" },
  { key: "email",      icon: "ti-mail",             label: "Email",      bg: "#fef3c7", color: "#92400e", section: "social" },
  { key: "erp",        icon: "ti-database",         label: "ERP",        bg: "#ede9fe", color: "#4c1d95", section: "access" },
  { key: "backoffice", icon: "ti-layout-dashboard", label: "Backoffice",  bg: "#d1fae5", color: "#065f46", section: "access" },
  { key: "custom1",   icon: "ti-link",             label: "Enlace 1",    bg: "#e0e7ff", color: "#3730a3", section: "access" },
  { key: "custom2",   icon: "ti-link",             label: "Enlace 2",    bg: "#f0fdf4", color: "#166534", section: "access" },
];

export default function LinksEditor({ initialLinks }) {
  const [links, setLinks] = useState(initialLinks || {});
  const [status, setStatus] = useState(null);

  function update(key, field, value) {
    setLinks(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { links } }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus("error");
    }
  }

  const social = LINK_DEFS.filter(d => d.section === "social");
  const access = LINK_DEFS.filter(d => d.section === "access");

  const renderRow = (def) => {
    const link = links[def.key] || { label: def.label, url: "", enabled: false };
    return (
      <div key={def.key} className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: def.bg }}
        >
          <i className={`ti ${def.icon} text-lg`} style={{ color: def.color }} aria-hidden="true" />
        </div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-24 flex-shrink-0">
          {def.label}
        </span>
        <button
          onClick={() => update(def.key, "enabled", !link.enabled)}
          className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ${
            link.enabled ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
          aria-label={`${link.enabled ? "Desactivar" : "Activar"} ${def.label}`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
              link.enabled ? "left-[18px]" : "left-0.5"
            }`}
          />
        </button>
        <input
          type="text"
          value={link.label}
          onChange={e => update(def.key, "label", e.target.value)}
          placeholder="Etiqueta"
          className="w-28 flex-shrink-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="url"
          value={link.url}
          onChange={e => update(def.key, "url", e.target.value)}
          placeholder={def.key === "email" ? "mailto:admin@waragps.com" : `https://waragps.com/${def.key}`}
          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Íconos y enlaces del footer
          </h2>
          <p className="text-slate-500 text-sm">
            Los enlaces habilitados aparecen en el pie del dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status === "saved" && (
            <span className="text-emerald-600 text-sm">✓ Guardado</span>
          )}
          {status === "error" && (
            <span className="text-red-600 text-sm">✗ Error</span>
          )}
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
          >
            {status === "saving" ? "Guardando..." : "Guardar enlaces"}
          </button>
        </div>
      </div>

      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        Redes y contacto
      </p>
      <div className="mb-4">{social.map(renderRow)}</div>

      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
        Accesos rápidos
      </p>
      <div>{access.map(renderRow)}</div>
    </div>
  );
}
