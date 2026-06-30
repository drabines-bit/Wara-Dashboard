"use client";

import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { fmtCurrency } from "@/lib/format";

Chart.register(...registerables);

const MESES_ABR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
function labelMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES_ABR[m - 1]} '${String(y).slice(2)}`;
}

const LINEAS = [
  { key: "facturacion", label: "Facturación" },
  { key: "cobranza", label: "Cobranza" },
  { key: "resultado", label: "Resultado" },
];

export default function GraficoBacktest({ filas }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [isDark, setIsDark] = useState(false);
  const [linea, setLinea] = useState("facturacion");

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const onTheme = (e) => setIsDark(e.detail !== "claro");
    window.addEventListener("wara:themechange", onTheme);
    return () => window.removeEventListener("wara:themechange", onTheme);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !filas?.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(148, 163, 184, 0.08)" : "rgba(100, 116, 139, 0.05)";
    const font = { family: "Plus Jakarta Sans" };

    const labels = filas.map((f) => labelMes(f.mes));
    const real = filas.map((f) => f.lineas[linea].real);
    const modelo = filas.map((f) => f.lineas[linea].modelo);
    const cfo = filas.map((f) => f.lineas[linea].cfo);

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Real", data: real, borderColor: "#0f172a", backgroundColor: "transparent", borderWidth: 3, tension: 0.3, pointRadius: 3, spanGaps: true },
          { label: "Modelo", data: modelo, borderColor: "#0284c7", backgroundColor: "transparent", borderWidth: 2, borderDash: [6, 4], tension: 0.3, pointRadius: 3, spanGaps: true },
          { label: "CFO", data: cfo, borderColor: "#f59e0b", backgroundColor: "transparent", borderWidth: 2, borderDash: [2, 3], tension: 0.3, pointRadius: 3, spanGaps: true },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", labels: { color: textColor, font: { ...font, size: 11, weight: "500" } } },
          tooltip: {
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            titleColor: isDark ? "#ffffff" : "#0f172a",
            bodyColor: isDark ? "#cbd5e1" : "#334155",
            borderColor: isDark ? "#334155" : "#e2e8f0",
            borderWidth: 1, padding: 12,
            callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw === null ? "sin dato" : fmtCurrency(ctx.raw)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font, callback: (v) => "$" + (v / 1000000).toFixed(0) + "M" } },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [filas, linea, isDark]);

  if (!filas?.length) return null;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Real vs. Modelo vs. CFO</h2>
        <div className="flex gap-1">
          {LINEAS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLinea(l.key)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                linea === l.key
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}
