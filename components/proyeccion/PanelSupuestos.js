"use client";

import { useEffect, useState } from "react";
import { fmtCurrency, fmtPercent, fmtDateTime } from "@/lib/format";

const TIPOS = [
  { value: "fijo",            label: "Fijo" },
  { value: "var_unidades",    label: "Variable (unidades)" },
  { value: "pct_facturacion", label: "% Facturación (IIBB)" },
];

const FUENTE_BADGE = {
  realizado: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  rem:       "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  override:  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

async function fetchJson(url, opts) {
  const res = await fetch(url, { cache: "no-store", ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`);
  return data;
}

export default function PanelSupuestos({ onRecalcular }) {
  const [tab, setTab] = useState("ventas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const [overridesVentas, setOverridesVentas] = useState({});
  const [proyectos, setProyectos] = useState([]);
  const [senda, setSenda] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [curva, setCurva] = useState(null);
  const [cfo, setCfo] = useState({});

  async function cargarTodo() {
    setCargando(true);
    setError(null);
    try {
      const [v, p, i, c, cob, cfoRes] = await Promise.all([
        fetchJson("/api/proyeccion/ventas/supuestos"),
        fetchJson("/api/proyeccion/proyectos"),
        fetchJson("/api/proyeccion/inflacion"),
        fetchJson("/api/proyeccion/costos/mapeo"),
        fetchJson("/api/proyeccion/cobranzas").catch(() => ({ curva: null })),
        fetchJson("/api/proyeccion/backtest/cfo"),
      ]);
      setOverridesVentas(v.overrides ?? {});
      setProyectos(p.proyectos ?? []);
      setSenda(i.senda ?? []);
      setCuentas(c.cuentas ?? []);
      setCurva(cob.curva ?? null);
      setCfo(cfoRes.cfo ?? {});
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarTodo(); }, []);

  async function avisarCambio(mensajeOk) {
    setMensaje(mensajeOk);
    setTimeout(() => setMensaje(null), 2500);
    await cargarTodo();
    onRecalcular?.();
  }

  async function accion(fn, mensajeOk) {
    try {
      await fn();
      await avisarCambio(mensajeOk);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Supuestos (admin)</h2>
        {mensaje && <span className="text-xs text-emerald-600 dark:text-emerald-400">{mensaje}</span>}
      </div>

      {error && (
        <div className="mb-4 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-5 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: "ventas", label: "Ventas" },
          { id: "inflacion", label: "Inflación" },
          { id: "costos", label: "Costos" },
          { id: "cfo", label: "Proyección CFO" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando supuestos…</p>
      ) : (
        <>
          {tab === "ventas" && (
            <VentasTab
              overrides={overridesVentas}
              proyectos={proyectos}
              onGuardarOverride={(mes, valor) =>
                accion(() => fetchJson("/api/proyeccion/ventas/supuestos", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mes, valor }),
                }), "Override de altas/bajas guardado")
              }
              onGuardarProyecto={(proyecto) =>
                accion(() => fetchJson("/api/proyeccion/proyectos", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(proyecto),
                }), "Proyecto guardado")
              }
              onEliminarProyecto={(id) =>
                accion(() => fetchJson(`/api/proyeccion/proyectos?id=${encodeURIComponent(id)}`, { method: "DELETE" }), "Proyecto eliminado")
              }
            />
          )}

          {tab === "inflacion" && (
            <InflacionTab
              senda={senda}
              onGuardarOverride={(mes, pct) =>
                accion(() => fetchJson("/api/proyeccion/inflacion", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mes, pct }),
                }), "Override de inflación guardado")
              }
            />
          )}

          {tab === "costos" && (
            <CostosTab
              cuentas={cuentas}
              onGuardarTipo={(accountId, tipo, nombre) =>
                accion(() => fetchJson("/api/proyeccion/costos/mapeo", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ accountId, tipo, nombre }),
                }), "Clasificación guardada")
              }
              onGuardarOverride={(accountId, mes, monto) =>
                accion(() => fetchJson("/api/proyeccion/costos/mapeo", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ accountId, mes, monto }),
                }), "Override de costo guardado")
              }
            />
          )}

          {tab === "cfo" && (
            <CfoTab
              cfo={cfo}
              onGuardar={(mes, valores) =>
                accion(() => fetchJson("/api/proyeccion/backtest/cfo", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mes, ...valores }),
                }), "Proyección CFO guardada")
              }
            />
          )}

          <CurvaCobranzaCard curva={curva} />
        </>
      )}
    </section>
  );
}

function proximosMeses(cantidad = 18) {
  const hoy = new Date();
  const meses = [];
  let y = hoy.getFullYear(), m = hoy.getMonth() + 1;
  for (let i = 0; i < cantidad; i++) {
    meses.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return meses;
}

function VentasTab({ overrides, proyectos, onGuardarOverride, onGuardarProyecto, onEliminarProyecto }) {
  const [mes, setMes] = useState("");
  const [valor, setValor] = useState("");
  const [nuevo, setNuevo] = useState({ nombre: "", monto: "", fechaFacturacion: "" });
  const meses = proximosMeses();

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Altas/Bajas netas (override mensual)</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Por defecto se usa el promedio móvil histórico de abonos activos. Un override pisa ese default para el mes elegido.
        </p>
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <select value={mes} onChange={(e) => setMes(e.target.value)} className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5">
            <option value="">Mes…</option>
            {meses.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="number" placeholder="Unidades netas (+/-)" value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 w-44"
          />
          <button
            onClick={() => { if (mes && valor !== "") { onGuardarOverride(mes, Number(valor)); setMes(""); setValor(""); } }}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium"
          >
            Guardar override
          </button>
        </div>
        {Object.keys(overrides).length > 0 && (
          <table className="text-sm">
            <tbody>
              {Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => (
                <tr key={m} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-4 text-slate-500">{m}</td>
                  <td className="py-1.5 font-medium text-slate-700 dark:text-slate-300">{v > 0 ? "+" : ""}{v} unidades</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Proyectos puntuales</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Montos nominales (no se inflan), facturados en el mes indicado.</p>
        <div className="space-y-1.5 mb-3">
          {proyectos.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{p.nombre}</p>
                <p className="text-xs text-slate-500">{fmtCurrency(p.monto)} · {p.fechaFacturacion}</p>
              </div>
              <button onClick={() => onEliminarProyecto(p.id)} className="text-slate-400 hover:text-red-600 text-xs px-2">
                <i className="ti ti-trash" aria-hidden="true" />
              </button>
            </div>
          ))}
          {proyectos.length === 0 && <p className="text-xs text-slate-400">Sin proyectos cargados.</p>}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <input placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo((p) => ({ ...p, nombre: e.target.value }))}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 flex-1 min-w-[140px]" />
          <input type="number" placeholder="Monto" value={nuevo.monto} onChange={(e) => setNuevo((p) => ({ ...p, monto: e.target.value }))}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 w-32" />
          <input type="date" value={nuevo.fechaFacturacion} onChange={(e) => setNuevo((p) => ({ ...p, fechaFacturacion: e.target.value }))}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5" />
          <button
            onClick={() => {
              if (nuevo.nombre && nuevo.monto !== "" && nuevo.fechaFacturacion) {
                onGuardarProyecto({ nombre: nuevo.nombre, monto: Number(nuevo.monto), fechaFacturacion: nuevo.fechaFacturacion });
                setNuevo({ nombre: "", monto: "", fechaFacturacion: "" });
              }
            }}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function InflacionTab({ senda, onGuardarOverride }) {
  const [edicion, setEdicion] = useState({});

  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Pasado: IPC INDEC realizado. Futuro: REM. Un override manual pisa la fuente para ese mes.
      </p>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="text-sm w-full">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
              <th className="pb-2 font-medium">Mes</th>
              <th className="pb-2 font-medium">% mensual</th>
              <th className="pb-2 font-medium">Fuente</th>
              <th className="pb-2 font-medium">Override</th>
            </tr>
          </thead>
          <tbody>
            {senda.map((s) => (
              <tr key={s.mes} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-4 text-slate-500">{s.mes}</td>
                <td className="py-1.5 pr-4 font-medium text-slate-700 dark:text-slate-300">{fmtPercent(s.pct)}</td>
                <td className="py-1.5 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${FUENTE_BADGE[s.fuente] ?? ""}`}>{s.fuente}</span>
                </td>
                <td className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" step="0.01" placeholder="%"
                      value={edicion[s.mes] ?? ""}
                      onChange={(e) => setEdicion((p) => ({ ...p, [s.mes]: e.target.value }))}
                      className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 w-20"
                    />
                    <button
                      onClick={() => {
                        const v = edicion[s.mes];
                        if (v !== undefined && v !== "") onGuardarOverride(s.mes, Number(v));
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Guardar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CostosTab({ cuentas, onGuardarTipo, onGuardarOverride }) {
  const [overrideForm, setOverrideForm] = useState({ accountId: "", mes: "", monto: "" });
  const cuentasFijas = cuentas.filter((c) => c.tipo === "fijo");
  const meses = proximosMeses();

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Mapeo de cuentas (último mes cerrado)</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="text-sm w-full">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="pb-2 font-medium">Cuenta</th>
                <th className="pb-2 font-medium">Monto base</th>
                <th className="pb-2 font-medium">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((c) => (
                <tr key={c.accountId} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-4 text-slate-700 dark:text-slate-300">
                    {c.nombre}
                    {c.revisar && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        revisar
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-4 text-slate-500 whitespace-nowrap">{fmtCurrency(c.montoBase)}</td>
                  <td className="py-1.5">
                    <select
                      value={c.tipo}
                      onChange={(e) => onGuardarTipo(c.accountId, e.target.value, c.nombre)}
                      className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1"
                    >
                      {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {cuentas.length === 0 && (
                <tr><td colSpan={3} className="py-3 text-xs text-slate-400">Sin cuentas en el baseline del último mes cerrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Override puntual (cuentas fijas)</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Escalón aditivo sobre el monto base inflado, para un mes específico.</p>
        <div className="flex flex-wrap items-end gap-2">
          <select
            value={overrideForm.accountId}
            onChange={(e) => setOverrideForm((p) => ({ ...p, accountId: e.target.value }))}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5"
          >
            <option value="">Cuenta…</option>
            {cuentasFijas.map((c) => <option key={c.accountId} value={c.accountId}>{c.nombre}</option>)}
          </select>
          <select
            value={overrideForm.mes}
            onChange={(e) => setOverrideForm((p) => ({ ...p, mes: e.target.value }))}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5"
          >
            <option value="">Mes…</option>
            {meses.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="number" placeholder="Monto adicional" value={overrideForm.monto}
            onChange={(e) => setOverrideForm((p) => ({ ...p, monto: e.target.value }))}
            className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 w-40"
          />
          <button
            onClick={() => {
              const { accountId, mes, monto } = overrideForm;
              if (accountId && mes && monto !== "") {
                onGuardarOverride(accountId, mes, Number(monto));
                setOverrideForm({ accountId: "", mes: "", monto: "" });
              }
            }}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium"
          >
            Guardar override
          </button>
        </div>
      </div>
    </div>
  );
}

function CfoTab({ cfo, onGuardar }) {
  const [form, setForm] = useState({ mes: "", facturacion: "", cobranzas: "", resultado: "" });
  const meses = proximosMeses();

  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Proyección manual del CFO por mes, para comparar contra el modelo y lo real en el backtesting (<code>/proyeccion/backtest</code>).
      </p>
      <div className="overflow-x-auto custom-scrollbar mb-4">
        <table className="text-sm w-full">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
              <th className="pb-2 font-medium">Mes</th>
              <th className="pb-2 font-medium">Facturación</th>
              <th className="pb-2 font-medium">Cobranzas</th>
              <th className="pb-2 font-medium">Resultado</th>
              <th className="pb-2 font-medium">Cargado el</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(cfo).sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => (
              <tr key={mes} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-4 text-slate-500">{mes}</td>
                <td className="py-1.5 pr-4 text-slate-700 dark:text-slate-300">{fmtCurrency(v.facturacion)}</td>
                <td className="py-1.5 pr-4 text-slate-700 dark:text-slate-300">{fmtCurrency(v.cobranzas)}</td>
                <td className="py-1.5 pr-4 text-slate-700 dark:text-slate-300">{fmtCurrency(v.resultado)}</td>
                <td className="py-1.5 text-xs text-slate-400">{v.cargadoEl}</td>
              </tr>
            ))}
            {Object.keys(cfo).length === 0 && (
              <tr><td colSpan={5} className="py-3 text-xs text-slate-400">Sin proyecciones del CFO cargadas todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <select value={form.mes} onChange={(e) => setForm((p) => ({ ...p, mes: e.target.value }))}
          className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5">
          <option value="">Mes…</option>
          {meses.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="number" placeholder="Facturación" value={form.facturacion}
          onChange={(e) => setForm((p) => ({ ...p, facturacion: e.target.value }))}
          className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 w-36" />
        <input type="number" placeholder="Cobranzas" value={form.cobranzas}
          onChange={(e) => setForm((p) => ({ ...p, cobranzas: e.target.value }))}
          className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 w-36" />
        <input type="number" placeholder="Resultado" value={form.resultado}
          onChange={(e) => setForm((p) => ({ ...p, resultado: e.target.value }))}
          className="text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 w-36" />
        <button
          onClick={() => {
            const { mes, facturacion, cobranzas, resultado } = form;
            if (mes && facturacion !== "" && cobranzas !== "" && resultado !== "") {
              onGuardar(mes, { facturacion: Number(facturacion), cobranzas: Number(cobranzas), resultado: Number(resultado) });
              setForm({ mes: "", facturacion: "", cobranzas: "", resultado: "" });
            }
          }}
          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function CurvaCobranzaCard({ curva }) {
  if (!curva) return null;
  return (
    <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Curva de cobranza</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Calculada por el cron mensual a partir de cohortes en Odoo. No editable desde acá.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {curva.c?.map((v, k) => (
          <div key={k} className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">c{k}</span> {fmtPercent(v * 100, 1)}
          </div>
        ))}
        <div className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium">
          cola {fmtPercent((curva.cola ?? 0) * 100, 1)}
        </div>
      </div>
      <p className="text-xs text-slate-400">
        {curva.cohortesUsadas} cohorte{curva.cohortesUsadas === 1 ? "" : "s"} madura{curva.cohortesUsadas === 1 ? "" : "s"} usada{curva.cohortesUsadas === 1 ? "" : "s"}
        {curva.computedAt && <> · calculada el {fmtDateTime(curva.computedAt)}</>}
      </p>
    </div>
  );
}
