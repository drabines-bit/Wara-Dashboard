"use client";
import { useState } from "react";

const DATA_TYPES = [
  { value: "currency", label: "Moneda ($)" },
  { value: "percent",  label: "Porcentaje (%)" },
  { value: "number",   label: "Número" },
];

const CHART_COLORS = [
  "#0284c7","#0f766e","#7c3aed","#be185d",
  "#b45309","#15803d","#e11d48","#2563eb",
  "#d97706","#059669","#dc2626","#7c3aed",
];

const EMPTY_VAR = {
  id: null,
  sheetLabel: "",
  displayName: "",
  tooltip: "",
  dataType: "currency",
  showInMatrix: true,
  showAsKPI: false,
  showInChart: false,
  chartColor: "#0284c7",
  enabled: true,
};

export default function CustomVariablesEditor({ initialVariables }) {
  const [vars,    setVars]    = useState(initialVariables ?? []);
  const [editing, setEditing] = useState(null);
  const [status,  setStatus]  = useState(null);

  function openNew() {
    setEditing({ ...EMPTY_VAR });
  }

  function openEdit(v) {
    setEditing({ ...v });
  }

  function cancelEdit() {
    setEditing(null);
  }

  function saveEdit() {
    if (!editing.sheetLabel.trim() || !editing.displayName.trim()) return;

    if (editing.id) {
      setVars(prev => prev.map(v => v.id === editing.id ? { ...editing } : v));
    } else {
      const newVar = { ...editing, id: `cv_${Date.now()}` };
      setVars(prev => [...prev, newVar]);
    }
    setEditing(null);
  }

  function deleteVar(id) {
    if (!confirm("¿Eliminar esta variable?")) return;
    setVars(prev => prev.filter(v => v.id !== id));
  }

  function toggleEnabled(id) {
    setVars(prev => prev.map(v => v.id === id ? { ...v, enabled: !v.enabled } : v));
  }

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { customVariables: vars } }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus("error");
    }
  }

  const typeLabel = (t) => DATA_TYPES.find(d => d.value === t)?.label ?? t;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">

      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Variables personalizadas
          </h2>
          <p className="text-slate-500 text-sm">
            Definí qué filas del Sheet importar y cómo mostrarlas.
            El nombre en "Etiqueta en el Sheet" debe coincidir exactamente con la columna A.
          </p>
        </div>
        <div className="flex items-center gap-3 ml-4">
          {status === "saved"  && <span className="text-emerald-600 text-sm">✓ Guardado</span>}
          {status === "error"  && <span className="text-red-600 text-sm">✗ Error</span>}
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
          >
            {status === "saving" ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {vars.length > 0 && (
        <div className="mb-4 divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {vars.map(v => (
            <div key={v.id} className={`flex items-center gap-3 px-4 py-3 ${!v.enabled ? "opacity-50" : ""}`}>
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: v.showInChart ? v.chartColor : "#94a3b8" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {v.displayName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  Sheet: "{v.sheetLabel}" · {typeLabel(v.dataType)}
                  {v.showInMatrix && " · Tabla"}
                  {v.showAsKPI    && " · KPI"}
                  {v.showInChart  && " · Gráfico"}
                </p>
              </div>
              <button
                onClick={() => toggleEnabled(v.id)}
                className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ${
                  v.enabled ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
                title={v.enabled ? "Desactivar" : "Activar"}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                  v.enabled ? "left-[18px]" : "left-0.5"
                }`}/>
              </button>
              <button
                onClick={() => openEdit(v)}
                className="text-slate-400 hover:text-indigo-600 transition text-sm px-2"
                title="Editar"
              >
                Editar
              </button>
              <button
                onClick={() => deleteVar(v.id)}
                className="text-slate-400 hover:text-red-600 transition text-sm px-2"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {vars.length === 0 && !editing && (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-xl mb-4">
          No hay variables personalizadas. Agregá la primera.
        </div>
      )}

      {editing && (
        <div className="mb-4 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 bg-indigo-50/30 dark:bg-indigo-950/30">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">
            {editing.id ? "Editar variable" : "Nueva variable"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Etiqueta en el Sheet (columna A) *
              </label>
              <input
                type="text"
                value={editing.sheetLabel}
                onChange={e => setEditing(prev => ({ ...prev, sheetLabel: e.target.value }))}
                placeholder="Ej: Facturación Recurrente"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Nombre en el dashboard *
              </label>
              <input
                type="text"
                value={editing.displayName}
                onChange={e => setEditing(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Ej: Facturación Recurrente"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Descripción (aparece al pasar el mouse)
              </label>
              <textarea
                rows={2}
                placeholder="Ej: Abono promedio por usuario activo..."
                value={editing.tooltip ?? ''}
                onChange={e => setEditing(prev => ({ ...prev, tooltip: e.target.value }))}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700
                           bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300
                           px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Tipo de dato
              </label>
              <select
                value={editing.dataType}
                onChange={e => setEditing(prev => ({ ...prev, dataType: e.target.value }))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DATA_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {editing.showInChart && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Color en el gráfico
                </label>
                <div className="flex flex-wrap gap-2">
                  {CHART_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditing(prev => ({ ...prev, chartColor: c }))}
                      className={`w-7 h-7 rounded-full transition ${
                        editing.chartColor === c ? "ring-2 ring-offset-2 ring-indigo-500" : ""
                      }`}
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Mostrar en</p>
            <div className="flex flex-wrap gap-4">
              {[
                { field: "showInMatrix", label: "Tabla de indicadores" },
                { field: "showAsKPI",    label: "Tarjeta KPI" },
                { field: "showInChart",  label: "Gráfico de tendencias" },
              ].map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing[field]}
                    onChange={e => setEditing(prev => ({ ...prev, [field]: e.target.checked }))}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={!editing.sheetLabel.trim() || !editing.displayName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium px-4 py-2 rounded-lg text-sm transition"
            >
              {editing.id ? "Actualizar" : "Agregar"}
            </button>
            <button
              onClick={cancelEdit}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 px-4 py-2 rounded-lg text-sm transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!editing && (
        <button
          onClick={openNew}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium transition"
        >
          <span className="text-lg leading-none">+</span>
          Agregar variable
        </button>
      )}
    </div>
  );
}
