"use client";

import { useState } from "react";

const PDF_SECTIONS_REGISTRY = [
  { id: 'kpis',           label: 'KPIs y Diagnóstico',      desc: 'Indicadores del período seleccionado' },
  { id: 'balance',        label: 'Balance',                  desc: 'Activo corriente, no corriente y pasivo' },
  { id: 'graficos',       label: 'Gráficos y Tendencias',   desc: 'Evolución mensual de facturación y cobranza' },
  { id: 'matriz',         label: 'Matriz de Indicadores',   desc: 'Tabla completa de los 12 meses' },
  { id: 'pnl',            label: 'P&L Odoo',                desc: 'Estado de resultados del año en curso' },
  { id: 'odoo_comercial', label: 'Análisis Comercial Odoo', desc: 'Top deudores y facturación por provincia' },
];

const PDF_SECTIONS_DEFAULT = ['kpis', 'balance', 'graficos', 'matriz', 'pnl', 'odoo_comercial'];

const TV_CARD_REGISTRY = [
  { id: 'scoreGlobal',             label: 'Score Global',          icon: 'ti-gauge'           },
  { id: 'cumplimientoFacturacion', label: 'Cumpl. Facturación',    icon: 'ti-chart-bar'       },
  { id: 'cumplimientoCobranza',    label: 'Cumpl. Cobranza',       icon: 'ti-cash'            },
  { id: 'variacionFacturacion',    label: 'Variación Facturación', icon: 'ti-trending-up'     },
  { id: 'variacionCobranza',       label: 'Variación Cobranza',    icon: 'ti-trending-up'     },
  { id: 'liquidez',                label: 'Ratio Liquidez',        icon: 'ti-droplet'         },
  { id: 'inflacion',               label: 'Inflación INDEC',       icon: 'ti-percentage'      },
  { id: 'dolarOficial',            label: 'Dólar Oficial',         icon: 'ti-currency-dollar' },
  { id: 'dolarMep',                label: 'Dólar MEP',             icon: 'ti-currency-dollar' },
  { id: 'dolarClp',                label: 'CLP',                   icon: 'ti-currency'        },
];

const TV_CARDS_DEFAULT = [
  'cumplimientoFacturacion', 'cumplimientoCobranza', 'variacionFacturacion',
  'liquidez', 'inflacion', 'dolarOficial',
];

export default function ConfigEditor({ initialConfig }) {
  const [config, setConfig] = useState({
    ...initialConfig,
    tvMode:    { ...initialConfig?.tvMode,    cards:    initialConfig?.tvMode?.cards    ?? TV_CARDS_DEFAULT    },
    pdfExport: { ...initialConfig?.pdfExport, sections: initialConfig?.pdfExport?.sections ?? PDF_SECTIONS_DEFAULT },
  });
  const [status, setStatus] = useState(null); // null | "saving" | "saved" | "error"

  function updateConfig(path, value) {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let ref = next;
      for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
      ref[keys[keys.length - 1]] = value;
      return next;
    });
  }

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setStatus("saved");
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus("error");
    }
  }

  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  return (
    <div className="space-y-8">

      {/* SEMÁFOROS */}
      <Section title="Umbrales de Semáforos" desc="Define cuándo cada indicador es verde, amarillo o rojo.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ThresholdCard
            title="Cumplimiento (%)"
            fields={[
              { label: "Verde (≥)",    path: "semaphores.cumplimiento.verde",    value: config.semaphores.cumplimiento.verde    },
              { label: "Amarillo (≥)", path: "semaphores.cumplimiento.amarillo", value: config.semaphores.cumplimiento.amarillo },
            ]}
            onChange={updateConfig}
          />
          <ThresholdCard
            title="Variación M/M (%)"
            fields={[
              { label: "Verde (>)", path: "semaphores.variacion.verde", value: config.semaphores.variacion.verde },
              { label: "Rojo (<)",  path: "semaphores.variacion.rojo",  value: config.semaphores.variacion.rojo  },
            ]}
            onChange={updateConfig}
          />
          <ThresholdCard
            title="Liquidez (ratio)"
            fields={[
              { label: "Verde (≥)",    path: "semaphores.liquidez.verde",    value: config.semaphores.liquidez.verde    },
              { label: "Amarillo (≥)", path: "semaphores.liquidez.amarillo", value: config.semaphores.liquidez.amarillo },
            ]}
            onChange={updateConfig}
          />
        </div>
      </Section>

      {/* ETIQUETAS */}
      <Section title="Nombres de Indicadores" desc="Personalizá los títulos que aparecen en las tarjetas KPI del dashboard.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(config.labels).map(([key, val]) => (
            <LabelInput
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              path={`labels.${key}`}
              value={val}
              onChange={updateConfig}
            />
          ))}
        </div>
      </Section>

      {/* GRÁFICOS VISIBLES */}
      <Section
        title="Gráficos Visibles"
        desc="Activá o desactivá gráficos individuales en la pestaña de Gráficos y Tendencias."
      >
        <div className="space-y-3">
          {[
            { path: "charts.showTrends",      label: "Tendencias (Facturación vs. Cobranza)"   },
            { path: "charts.showSolvency",    label: "Solvencia (Activo / Pasivo)"              },
            { path: "charts.showComposition", label: "Composición de Facturación por Canal"     },
          ].map(({ path, label }) => {
            const [section, field] = path.split(".");
            const value = config[section][field];
            return (
              <label
                key={path}
                className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{label}</span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => updateConfig(path, e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
              </label>
            );
          })}
        </div>
      </Section>

      {/* OBJETIVOS MENSUALES */}
      <Section
        title="Objetivos Mensuales"
        desc="Valores de referencia para Facturación y Cobranza. Se usan como targets en las KPI cards y en los semáforos de cumplimiento."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="pb-2 text-slate-500 font-medium w-36">Indicador</th>
                {months.map((m) => (
                  <th key={m} className="pb-2 text-slate-500 font-medium text-center px-1">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { key: "facturacion", label: "Facturación ($)" },
                { key: "cobranza",    label: "Cobranza ($)"    },
              ].map(({ key, label }) => (
                <tr key={key}>
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-300 font-medium text-xs">
                    {label}
                  </td>
                  {Array(12).fill(0).map((_, i) => (
                    <td key={i} className="py-2 px-1">
                      <input
                        type="number"
                        value={config.objetivos[key][i] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : Number(e.target.value);
                          const newArr = [...config.objetivos[key]];
                          newArr[i] = val;
                          updateConfig(`objetivos.${key}`, newArr);
                        }}
                        className="w-20 text-center text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="—"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* MODO TV */}
      <Section
        title={<span className="flex items-center gap-2"><i className="ti ti-device-tv" aria-hidden="true" />Tarjetas visibles en Modo TV</span>}
        desc="Seleccioná qué métricas aparecen en el Modo TV de oficina."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TV_CARD_REGISTRY.map(card => {
            const activeCards = config?.tvMode?.cards ?? TV_CARDS_DEFAULT;
            const enabled = activeCards.includes(card.id);
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  const next = enabled
                    ? activeCards.filter(id => id !== card.id)
                    : [...activeCards, card.id];
                  updateConfig('tvMode.cards', next);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                  enabled
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500'
                }`}
              >
                <i className={`ti ${card.icon} text-base`} aria-hidden="true" />
                <span className="flex-1 text-xs font-medium">{card.label}</span>
                <i className={`ti ${enabled ? 'ti-check' : 'ti-plus'} text-xs opacity-60`} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </Section>

      {/* EXPORT PDF */}
      <Section
        title={<span className="flex items-center gap-2"><i className="ti ti-file-export" aria-hidden="true" />Secciones del export PDF</span>}
        desc="La portada siempre se incluye. Elegí el resto."
      >
        {/* Portada — bloqueada */}
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60 cursor-not-allowed">
          <i className="ti ti-file-text text-base text-slate-400" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Portada</p>
            <p className="text-xs text-slate-400">Logo, nombre y período — siempre incluida</p>
          </div>
          <i className="ti ti-lock text-xs text-slate-400" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PDF_SECTIONS_REGISTRY.map(sec => {
            const activeSections = config?.pdfExport?.sections ?? PDF_SECTIONS_DEFAULT;
            const enabled = activeSections.includes(sec.id);
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  const next = enabled
                    ? activeSections.filter(id => id !== sec.id)
                    : [...activeSections, sec.id];
                  setConfig(prev => ({
                    ...prev,
                    pdfExport: { ...prev.pdfExport, sections: next },
                  }));
                }}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                  enabled
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <i className={`ti ${enabled ? 'ti-check' : 'ti-plus'} text-sm mt-0.5 flex-shrink-0 ${
                  enabled ? 'text-indigo-500' : 'text-slate-400'
                }`} aria-hidden="true" />
                <div>
                  <p className={`text-xs font-medium ${
                    enabled ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'
                  }`}>{sec.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sec.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* BOTÓN GUARDAR */}
      <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        {status === "saved" && (
          <span className="text-emerald-600 text-sm">✓ Configuración guardada</span>
        )}
        {status === "error" && (
          <span className="text-red-600 text-sm">✗ Error al guardar. Intentá nuevamente.</span>
        )}
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm"
        >
          {status === "saving" ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function Section({ title, desc, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
      <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{title}</h2>
      <p className="text-slate-500 text-sm mb-5">{desc}</p>
      {children}
    </div>
  );
}

function ThresholdCard({ title, fields, onChange }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-3">{title}</p>
      <div className="space-y-3">
        {fields.map(({ label, path, value }) => (
          <div key={path} className="flex items-center justify-between">
            <label className="text-slate-500 text-xs">{label}</label>
            <input
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => onChange(path, parseFloat(e.target.value))}
              className="w-20 text-right text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function LabelInput({ label, path, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(path, e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
