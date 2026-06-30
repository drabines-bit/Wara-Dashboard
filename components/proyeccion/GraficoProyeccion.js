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

export default function GraficoProyeccion({ detalle }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const onTheme = (e) => setIsDark(e.detail !== "claro");
    window.addEventListener("wara:themechange", onTheme);
    return () => window.removeEventListener("wara:themechange", onTheme);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !detalle?.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(148, 163, 184, 0.08)" : "rgba(100, 116, 139, 0.05)";
    const font = { family: "Plus Jakarta Sans" };

    const labels = detalle.map((d) => labelMes(d.mes));
    const facturacion = detalle.map((d) => d.facturacionNeta);
    const cobranza = detalle.map((d) => d.cobranzaConIva);
    const resultado = detalle.map((d) => d.resultadoDevengado);

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Facturación neta",
            data: facturacion,
            borderColor: "#0284c7",
            backgroundColor: "rgba(2,132,199,0.06)",
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 5,
            fill: false,
            order: 1,
          },
          {
            label: "Cobranza (con IVA)",
            data: cobranza,
            borderColor: "#10b981",
            backgroundColor: "rgba(245, 158, 11, 0.16)", // ámbar translúcido: resalta la brecha vs Facturación
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 5,
            fill: "-1", // sombrea el área entre esta línea y Facturación neta = capital de trabajo
            order: 2,
          },
          {
            label: "Resultado devengado",
            data: resultado,
            borderColor: "#a855f7",
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [6, 4],
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 5,
            fill: false,
            order: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", labels: { color: textColor, font: { ...font, size: 11, weight: "500" } } },
          tooltip: {
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            titleColor: isDark ? "#ffffff" : "#0f172a",
            bodyColor: isDark ? "#cbd5e1" : "#334155",
            borderColor: isDark ? "#334155" : "#e2e8f0",
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${fmtCurrency(ctx.raw)}`,
              footer: (items) => {
                const fact = items.find((i) => i.dataset.label === "Facturación neta")?.raw ?? 0;
                const cob  = items.find((i) => i.dataset.label === "Cobranza (con IVA)")?.raw ?? 0;
                return `Brecha (capital de trabajo): ${fmtCurrency(fact - cob)}`;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font } },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font, callback: (v) => "$" + (v / 1000000).toFixed(0) + "M" },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [detalle, isDark]);

  if (!detalle?.length) return null;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-8">
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Facturación vs. Cobranza vs. Resultado</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        El área sombreada entre Facturación y Cobranza es el capital de trabajo que financia el negocio mes a mes.
      </p>
      <div className="h-80">
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}
