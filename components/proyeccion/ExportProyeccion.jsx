"use client";

import { useState } from "react";

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`);
  return data;
}

async function cargarSupuestos() {
  const [v, p, i] = await Promise.all([
    fetchJson("/api/proyeccion/ventas/supuestos"),
    fetchJson("/api/proyeccion/proyectos"),
    fetchJson("/api/proyeccion/inflacion"),
  ]);
  return { overridesVentas: v.overrides ?? {}, proyectos: p.proyectos ?? [], senda: i.senda ?? [] };
}

export default function ExportProyeccion({ detalle, subtotalesAnuales, chartCanvasRef }) {
  const [generando, setGenerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState(null); // null | 'ok' | 'error'
  const [error, setError] = useState("");

  async function handleExportar() {
    setGenerando(true);
    setError("");
    try {
      const supuestos = await cargarSupuestos();
      const { generateProyeccionReport } = await import("@/lib/proyeccion/generatePdfProyeccion");
      await generateProyeccionReport({
        detalle, subtotalesAnuales, supuestos,
        chartCanvas: chartCanvasRef?.current ?? null,
        mode: "save",
      });
    } catch (e) {
      setError(e.message);
      setEstado("error");
    } finally {
      setGenerando(false);
    }
  }

  async function handleEnviarEmail() {
    setEnviando(true);
    setEstado(null);
    setError("");
    try {
      const supuestos = await cargarSupuestos();
      const { generateProyeccionReport } = await import("@/lib/proyeccion/generatePdfProyeccion");
      const pdfBase64 = await generateProyeccionReport({
        detalle, subtotalesAnuales, supuestos,
        chartCanvas: chartCanvasRef?.current ?? null,
        mode: "base64",
      });
      if (!pdfBase64) throw new Error("No se pudo generar el PDF");

      const primerDic = (subtotalesAnuales ?? []).find((s) => s.hasta.endsWith("-12"));
      const resultadoAlCierre = primerDic ? primerDic.resultadoDevengado : detalle[detalle.length - 1].resultadoDevengado;
      const cajaAcumulada18m = detalle.reduce((acc, d) => acc + d.cajaOperativa, 0);

      const res = await fetch("/api/proyeccion/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64, mesCorrida: detalle?.[0]?.mes, resultadoAlCierre, cajaAcumulada18m,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al enviar");
      setEstado("ok");
      setTimeout(() => setEstado(null), 4000);
    } catch (e) {
      setError(e.message);
      setEstado("error");
    } finally {
      setEnviando(false);
    }
  }

  if (!detalle?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <button
        onClick={handleExportar}
        disabled={generando}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                   text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all disabled:opacity-50"
      >
        <i className={`ti ${generando ? "ti-loader-2 animate-spin" : "ti-file-type-pdf"} text-sm`} aria-hidden="true" />
        {generando ? "Generando…" : "Exportar PDF"}
      </button>
      <button
        onClick={handleEnviarEmail}
        disabled={enviando}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700
                   text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all disabled:opacity-50"
      >
        <i className={`ti ${enviando ? "ti-loader-2 animate-spin" : "ti-mail"} text-sm`} aria-hidden="true" />
        {enviando ? "Enviando…" : "Enviar por email"}
      </button>
      {estado === "ok" && (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <i className="ti ti-circle-check" aria-hidden="true" /> Reporte enviado
        </span>
      )}
      {estado === "error" && (
        <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
        </span>
      )}
    </div>
  );
}
