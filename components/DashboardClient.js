"use client";

import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import Link from "next/link";
import {
  DollarSign, CreditCard, Percent, Activity, LayoutDashboard,
  TrendingUp, TrafficCone, Table2, PieChart, Wallet, LineChart,
  ShieldCheck, Layers, ClipboardCheck, Sparkles, Info,
  AlertTriangle, CheckCircle, X, Moon, Sun,
} from "lucide-react";

Chart.register(...registerables);

// ─── Data helpers ────────────────────────────────────────────────────────────

function getEmptyData() {
  const arr = () => Array(12).fill(null);
  return {
    months: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
    facturacion:       { real: arr(), variacion: arr(), objetivo: arr(), cumplimiento: arr() },
    cobranza:          { real: arr(), variacion: arr(), objetivo: arr(), cumplimiento: arr() },
    activoCorriente:   { total: arr(), cajaBancos: arr(), fci: arr(), cheques: arr(), deudores: arr(), top20Deudores: arr(), plazoFijo: arr() },
    activoNoCorriente: { total: arr(), participacionOrbitrix: arr() },
    pasivoCorriente:   { total: arr(), proveedores: arr(), facturasPendientes: arr(), pagosComprometidos: arr() },
    pasivoNoCorriente: { total: arr(), planesArca: arr(), prestamos: arr() },
    facturacionMix:    { ratioAbonos: arr(), ratioInstalaciones: arr(), ratioOtros: arr() },
  };
}

function isExcelError(val) {
  return ["#VALUE!", "#DIV/0!", "#N/A", "#REF!"].includes(val);
}

function formatValueText(val, type = "currency") {
  if (isExcelError(val)) return "trabajando datos";
  if (val === null || val === undefined || val === "") return "-";
  if (typeof val === "string" && (val.includes("%") || val.includes(","))) return val;
  if (typeof val === "number") {
    if (type === "currency")
      return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
    if (type === "percent")
      return new Intl.NumberFormat("es-AR", { style: "percent", minimumFractionDigits: 2 }).format(val / 100);
    return val.toString();
  }
  return String(val);
}

function getNestedValue(obj, keyPath, index) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur?.[p] !== undefined) cur = cur[p];
    else return null;
  }
  return Array.isArray(cur) ? cur[index] : null;
}

function getSemaphoreColor(type, value) {
  if (isExcelError(value))
    return { color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20", label: "Sin datos", bg: "bg-amber-400" };

  const parseNum = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") return parseFloat(v.replace("%", "").replace(",", ".").trim());
    return 0;
  };

  if (type === "cumplimiento") {
    const n = parseNum(value);
    if (n >= 95) return { color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800", label: "Excelente (Verde)", bg: "bg-emerald-500" };
    if (n >= 80) return { color: "text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800", label: "Aceptable (Amarillo)", bg: "bg-amber-400" };
    return { color: "text-rose-700 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800", label: "Crítico (Rojo)", bg: "bg-rose-500" };
  }
  if (type === "variacion") {
    const n = parseNum(value);
    if (n > 5) return { color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800", label: "Crecimiento (Verde)", bg: "bg-emerald-500" };
    if (n >= -5) return { color: "text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800", label: "Estable (Amarillo)", bg: "bg-amber-400" };
    return { color: "text-rose-700 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800", label: "Caída (Rojo)", bg: "bg-rose-500" };
  }
  if (type === "liquidez") {
    const n = parseFloat(value);
    if (n >= 1.5) return { color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800", label: "Solvente (Verde)", bg: "bg-emerald-500" };
    if (n >= 1.0) return { color: "text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800", label: "Ajustado (Amarillo)", bg: "bg-amber-400" };
    return { color: "text-rose-700 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800", label: "Crítico (Rojo)", bg: "bg-rose-500" };
  }
  return { color: "text-slate-700 bg-slate-50 dark:bg-slate-800", label: "Neutro", bg: "bg-slate-400" };
}

// Matrix cell component — renders "trabajando datos" badge or formatted value
function MatrixCell({ val, type = "currency", isActive }) {
  const base = "p-3 text-center text-xs text-slate-600 dark:text-slate-300";
  const active = isActive ? "bg-indigo-50/40 dark:bg-indigo-950/10 border-x border-slate-200 dark:border-slate-700/50 font-medium" : "";
  let content;
  if (isExcelError(val)) {
    content = (
      <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/30">
        trabajando datos
      </span>
    );
  } else if (val === null || val === undefined || val === "") {
    content = <span className="text-slate-400 dark:text-slate-600">-</span>;
  } else {
    content = formatValueText(val, type);
  }
  return <td className={`${base} ${active}`}>{content}</td>;
}

const MATRIX_ROWS = [
  { label: "Facturación Real", key: "facturacion.real", type: "currency" },
  { label: "Variación m/m", key: "facturacion.variacion", type: "percent" },
  { label: "Objetivo Facturación", key: "facturacion.objetivo", type: "currency" },
  { label: "Cumplimiento Fact.", key: "facturacion.cumplimiento", type: "percent" },
  { label: "Cobranza Total", key: "cobranza.real", type: "currency", sectionBreak: true },
  { label: "Variación m/m Cobranza", key: "cobranza.variacion", type: "percent" },
  { label: "Objetivo Cobranza", key: "cobranza.objetivo", type: "currency" },
  { label: "Cumplimiento Cob.", key: "cobranza.cumplimiento", type: "percent" },
  { label: "ACTIVOS", isHeader: true, sectionBreak: true },
  { label: "Activo Corriente", key: "activoCorriente.total", type: "currency", bold: true },
  { label: "• Caja y Bancos", key: "activoCorriente.cajaBancos", type: "currency", indent: true },
  { label: "• FCI", key: "activoCorriente.fci", type: "currency", indent: true },
  { label: "• Cheques en Cartera", key: "activoCorriente.cheques", type: "currency", indent: true },
  { label: "• Deudores por Ventas", key: "activoCorriente.deudores", type: "currency", indent: true },
  { label: "• Plazo Fijos", key: "activoCorriente.plazoFijo", type: "currency", indent: true },
  { label: "Activo No Corriente", key: "activoNoCorriente.total", type: "currency", bold: true },
  { label: "• Part. Orbitrix Arg", key: "activoNoCorriente.participacionOrbitrix", type: "currency", indent: true },
  { label: "PASIVOS", isHeader: true, sectionBreak: true },
  { label: "Pasivo Corriente", key: "pasivoCorriente.total", type: "currency", bold: true },
  { label: "• Proveedores/Sueldos", key: "pasivoCorriente.proveedores", type: "currency", indent: true },
  { label: "• Facturas Pendientes", key: "pasivoCorriente.facturasPendientes", type: "currency", indent: true },
  { label: "• Pagos Comprometidos", key: "pasivoCorriente.pagosComprometidos", type: "currency", indent: true },
  { label: "Pasivo No Corriente", key: "pasivoNoCorriente.total", type: "currency", bold: true },
  { label: "• Planes de Pago ARCA", key: "pasivoNoCorriente.planesArca", type: "currency", indent: true },
  { label: "• Préstamos", key: "pasivoNoCorriente.prestamos", type: "currency", indent: true },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardClient({ initialData, config, isAdmin }) {
  const companyData = initialData || getEmptyData();

  const getInitialMonth = (d) => {
    let last = 0;
    for (let i = 0; i < 12; i++) {
      if (d.facturacion?.real[i] !== null) last = i;
    }
    return last;
  };

  const [selectedMonthIdx, setSelectedMonthIdx] = useState(() => getInitialMonth(companyData));
  const [activeTab, setActiveTab] = useState("tab-general");
  const [isDark, setIsDark] = useState(false);
  const [alert, setAlert] = useState(null);

  // Chart canvas refs
  const assetCanvasRef = useRef(null);
  const trendsCanvasRef = useRef(null);
  const solvencyCanvasRef = useRef(null);
  const compositionCanvasRef = useRef(null);

  // Chart instance refs
  const assetChart = useRef(null);
  const trendsChart = useRef(null);
  const solvencyChart = useRef(null);
  const compositionChart = useRef(null);

  // Init dark mode from storage / system preference
  useEffect(() => {
    const dark =
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(dark);
  }, []);

  // Apply .dark class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // ── Asset doughnut chart (tab-general) ────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "tab-general" || !assetCanvasRef.current) return;

    if (assetChart.current) { assetChart.current.destroy(); assetChart.current = null; }

    const caja    = companyData.activoCorriente.cajaBancos[selectedMonthIdx] || 0;
    const fci     = companyData.activoCorriente.fci[selectedMonthIdx] || 0;
    const cheques = companyData.activoCorriente.cheques[selectedMonthIdx] || 0;
    const deudores = companyData.activoCorriente.deudores[selectedMonthIdx] || 0;
    const plazoFijo = companyData.activoCorriente.plazoFijo[selectedMonthIdx] || 0;
    const hasData = (caja + fci + cheques + deudores + plazoFijo) > 0;

    assetChart.current = new Chart(assetCanvasRef.current, {
      type: "doughnut",
      data: {
        labels: ["Caja y Bancos", "FCI / Inversión", "Cheques Cartera", "Deudores Ventas", "Plazo Fijo"],
        datasets: [{
          data: hasData ? [caja, fci, cheques, deudores, plazoFijo] : [0, 0, 0, 0, 1],
          backgroundColor: hasData
            ? ["#0284c7", "#14b8a6", "#6366f1", "#f59e0b", "#10b981"]
            : ["#94a3b8"],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? "#1e293b" : "#ffffff",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                hasData
                  ? ` ${ctx.label}: ${formatValueText(ctx.raw)}`
                  : "Sin datos disponibles para este periodo",
            },
          },
        },
        cutout: "70%",
      },
    });

    return () => { if (assetChart.current) { assetChart.current.destroy(); assetChart.current = null; } };
  }, [companyData, selectedMonthIdx, isDark, activeTab]);

  // ── Trends + Solvency + Composition charts (tab-charts) ──────────────────
  useEffect(() => {
    if (activeTab !== "tab-charts") return;

    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(148, 163, 184, 0.08)" : "rgba(100, 116, 139, 0.05)";
    const tooltipBase = {
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
      titleColor: isDark ? "#ffffff" : "#0f172a",
      bodyColor: isDark ? "#cbd5e1" : "#334155",
      borderColor: isDark ? "#334155" : "#e2e8f0",
      borderWidth: 1,
      padding: 12,
    };
    const font = { family: "Plus Jakarta Sans" };

    // Trends
    if (trendsCanvasRef.current) {
      if (trendsChart.current) trendsChart.current.destroy();
      const labels = [], factArr = [], cobArr = [];
      companyData.months.forEach((m, i) => {
        if (companyData.facturacion.real[i] !== null || companyData.cobranza.real[i] !== null) {
          labels.push(m);
          factArr.push(companyData.facturacion.real[i]);
          cobArr.push(companyData.cobranza.real[i]);
        }
      });
      trendsChart.current = new Chart(trendsCanvasRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: "Facturación Real", data: factArr, borderColor: "#0284c7", backgroundColor: "rgba(2,132,199,0.05)", borderWidth: 3, tension: 0.35, fill: true, pointBackgroundColor: "#0284c7" },
            { label: "Cobranza Real",    data: cobArr,  borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.05)", borderWidth: 3, tension: 0.35, fill: true, pointBackgroundColor: "#10b981" },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { color: textColor, font: { ...font, size: 11, weight: "500" } } },
            tooltip: { ...tooltipBase, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatValueText(ctx.raw)}` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font, callback: (v) => "$" + (v / 1000000) + "M" } },
          },
        },
      });
    }

    // Solvency
    if (solvencyCanvasRef.current) {
      if (solvencyChart.current) solvencyChart.current.destroy();
      const labels = [], actArr = [], pasCArr = [], pasNCArr = [];
      companyData.months.forEach((m, i) => {
        const tot = companyData.activoCorriente.total[i];
        if (tot !== null && tot > 0) {
          labels.push(m);
          actArr.push(tot);
          pasCArr.push(companyData.pasivoCorriente.total[i] || 0);
          pasNCArr.push(companyData.pasivoNoCorriente.total[i] || 0);
        }
      });
      solvencyChart.current = new Chart(solvencyCanvasRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Activo Corriente",    data: actArr,   backgroundColor: "#6366f1", borderRadius: 6 },
            { label: "Pasivo Corriente",    data: pasCArr,  backgroundColor: "#f43f5e", borderRadius: 6 },
            { label: "Pasivo No Corriente", data: pasNCArr, backgroundColor: "#f59e0b", borderRadius: 6 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { color: textColor, font: { ...font, size: 11, weight: "500" } } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatValueText(ctx.raw)}` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, font, callback: (v) => "$" + (v / 1000000) + "M" } },
          },
        },
      });
    }

    // Composition
    if (compositionCanvasRef.current) {
      if (compositionChart.current) compositionChart.current.destroy();
      const labels = [], abonosArr = [], instalArr = [], otrosArr = [];
      companyData.months.forEach((month, i) => {
        const abonos = companyData.facturacionMix?.ratioAbonos?.[i];
        if (abonos !== null && abonos !== undefined) {
          labels.push(month);
          abonosArr.push(parseFloat(abonos.toFixed(2)));
          instalArr.push(parseFloat((companyData.facturacionMix?.ratioInstalaciones?.[i] || 0).toFixed(2)));
          otrosArr.push(parseFloat((companyData.facturacionMix?.ratioOtros?.[i] || 0).toFixed(2)));
        }
      });
      if (labels.length > 0) {
        compositionChart.current = new Chart(compositionCanvasRef.current, {
          type: "bar",
          data: {
            labels,
            datasets: [
              { label: "Abonos Recurrentes", data: abonosArr,  backgroundColor: "#0284c7", borderRadius: 4, stack: "total" },
              { label: "Instalaciones",      data: instalArr,  backgroundColor: "#f59e0b", borderRadius: 4, stack: "total" },
              { label: "Envíos / Otros",      data: otrosArr,   backgroundColor: "#14b8a6", borderRadius: 4, stack: "total" },
            ],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: { position: "top", labels: { color: textColor, font: { ...font, size: 11, weight: "500" }, padding: 16 } },
              tooltip: {
                ...tooltipBase,
                callbacks: {
                  label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw?.toFixed(1)}%`,
                  footer: (items) => `Total: ${items.reduce((s, i) => s + (i.raw || 0), 0).toFixed(1)}%`,
                },
              },
            },
            scales: {
              x: { stacked: true, grid: { display: false }, ticks: { color: textColor, font } },
              y: { stacked: true, min: 0, max: 105, grid: { color: gridColor }, ticks: { color: textColor, font, callback: (v) => v + "%" } },
            },
          },
        });
      }
    }

    return () => {
      [trendsChart, solvencyChart, compositionChart].forEach((ref) => {
        if (ref.current) { ref.current.destroy(); ref.current = null; }
      });
    };
  }, [companyData, selectedMonthIdx, isDark, activeTab]);

  // ── Computed values for selected month ────────────────────────────────────
  const monthName      = companyData.months[selectedMonthIdx];
  const factReal       = companyData.facturacion.real[selectedMonthIdx];
  const factObj        = companyData.facturacion.objetivo[selectedMonthIdx];
  const factCumpl      = companyData.facturacion.cumplimiento[selectedMonthIdx];
  const cobReal        = companyData.cobranza.real[selectedMonthIdx];
  const cobObj         = companyData.cobranza.objetivo[selectedMonthIdx];
  const cobCumpl       = companyData.cobranza.cumplimiento[selectedMonthIdx];
  const actCorr        = companyData.activoCorriente.total[selectedMonthIdx] || 0;
  const pasCorr        = companyData.pasivoCorriente.total[selectedMonthIdx] || 0;
  const varFact        = companyData.facturacion.variacion[selectedMonthIdx];
  const ratioLiquidez  = actCorr && pasCorr ? (actCorr / pasCorr).toFixed(2) : "0.00";

  const factSem  = getSemaphoreColor("cumplimiento", factCumpl);
  const cobSem   = getSemaphoreColor("cumplimiento", cobCumpl);
  const varSem   = getSemaphoreColor("variacion", varFact);
  const liqSem   = getSemaphoreColor("liquidez", ratioLiquidez);

  const factPct  = factObj && factReal ? ((factReal / factObj) * 100).toFixed(2) : 0;
  const cobPct   = cobObj  && cobReal  ? ((cobReal  / cobObj)  * 100).toFixed(2) : 0;

  const caja      = companyData.activoCorriente.cajaBancos[selectedMonthIdx] || 0;
  const fci       = companyData.activoCorriente.fci[selectedMonthIdx] || 0;
  const cheques   = companyData.activoCorriente.cheques[selectedMonthIdx] || 0;
  const deudores  = companyData.activoCorriente.deudores[selectedMonthIdx] || 0;
  const plazoFijo = companyData.activoCorriente.plazoFijo[selectedMonthIdx] || 0;
  const actTotal  = actCorr || 1;

  const pct = (n) => ((n / actTotal) * 100).toFixed(2);
  const liqInmPct   = ((caja + cheques) / actTotal) * 100;
  const deudPct     = (deudores / actTotal) * 100;
  const liqInmColor = liqInmPct >= 20 ? "bg-emerald-500" : liqInmPct >= 10 ? "bg-amber-500" : "bg-rose-500";
  const deudColor   = deudPct > 50 ? "bg-rose-500" : deudPct > 30 ? "bg-amber-500" : "bg-emerald-500";

  const hasAnyData    = companyData.facturacion.real.some((v) => v !== null);
  const hasCompMix    = companyData.facturacionMix?.ratioAbonos?.some((v) => v !== null);

  const TABS = [
    { id: "tab-general",    label: "Vista General (Enfoque Mensual)", Icon: LayoutDashboard },
    { id: "tab-charts",     label: "Gráficos y Tendencias",           Icon: TrendingUp      },
    { id: "tab-semaphores", label: "Reglas de Semáforos",             Icon: TrafficCone     },
    { id: "tab-table",      label: "Matriz de Indicadores (2026)",    Icon: Table2          },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Controls: month selector + dark mode */}
      <div className="flex items-center justify-between mb-6">
        <select
          value={selectedMonthIdx}
          onChange={(e) => setSelectedMonthIdx(parseInt(e.target.value))}
          className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium rounded-lg text-sm px-4 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all cursor-pointer"
        >
          {companyData.months.map((m, i) => (
            <option key={i} value={i}>Periodo: {m}</option>
          ))}
        </select>

        <button
          onClick={() => { const d = !isDark; setIsDark(d); localStorage.theme = d ? "dark" : "light"; }}
          className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors focus:outline-none"
        >
          {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* No-data banner */}
      {!hasAnyData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 text-sm">
            No hay datos importados aún.{" "}
            {isAdmin ? (
              <Link href="/admin/import" className="underline font-semibold">Importar datos desde Excel →</Link>
            ) : (
              "Contactá al administrador para importar los datos."
            )}
          </p>
        </div>
      )}

      {/* Alert */}
      {alert && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start space-x-3 ${
          alert.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
          : alert.type === "error"   ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
          : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30"
        }`}>
          <div className="mt-0.5">
            {alert.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">{alert.title}</p>
            <p className="text-xs mt-1 leading-relaxed">{alert.message}</p>
          </div>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { title: "Facturación Real",          value: formatValueText(factReal), subtitle: factObj ? `Objetivo: ${formatValueText(factObj)}` : "Objetivo sin definir", badge: isExcelError(factCumpl) ? "trabajando datos" : `${factCumpl || "0,00%"} Cumplimiento`, badgeClass: factSem.color, Icon: DollarSign,  iconColor: "text-sky-500 bg-sky-50 dark:bg-sky-950/50" },
          { title: "Cobranza Real",              value: formatValueText(cobReal),  subtitle: cobObj  ? `Objetivo: ${formatValueText(cobObj)}`  : "Objetivo sin definir", badge: isExcelError(cobCumpl) ? "trabajando datos"  : `${cobCumpl || "0,00%"} Cumplimiento`,  badgeClass: cobSem.color,  Icon: CreditCard,  iconColor: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50" },
          { title: "Variación m/m Facturación",  value: isExcelError(varFact) ? "trabajando datos" : (varFact || "0,00%"), subtitle: "Vs. mes anterior", badge: isExcelError(varFact) ? "Revisando" : (parseFloat(varFact) < 0 ? "Contracción" : "Aumento"), badgeClass: varSem.color, Icon: Percent,    iconColor: "text-amber-500 bg-amber-50 dark:bg-amber-950/50" },
          { title: "Ratio Liquidez Corriente",   value: isExcelError(actCorr) || isExcelError(pasCorr) ? "trabajando datos" : ratioLiquidez + "x", subtitle: "Activo Corriente / Pasivo Corriente", badge: isExcelError(actCorr) || isExcelError(pasCorr) ? "trabajando datos" : liqSem.label, badgeClass: liqSem.color, Icon: Activity, iconColor: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50" },
        ].map((m) => (
          <div key={m.title} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{m.title}</span>
              <div className={`${m.iconColor} p-2.5 rounded-xl`}><m.Icon className="w-5 h-5" /></div>
            </div>
            <div className="mb-4">
              <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{m.value}</h4>
              <p className="text-xs text-slate-500 mt-1">{m.subtitle}</p>
            </div>
            <div className="pt-3 border-t border-slate-50 dark:border-slate-700/50">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.badgeClass}`}>{m.badge}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 mb-8">
        <nav className="flex flex-wrap -mb-px space-x-6">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`pb-4 px-1 text-sm flex items-center space-x-2 border-b-2 transition-colors ${
                activeTab === id
                  ? "border-brand-500 text-brand-600 dark:text-sky-400 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── TAB 1: Vista General ─────────────────────────────────────────── */}
      <section className={activeTab === "tab-general" ? "block" : "hidden"}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Análisis operativo */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center space-x-2">
                  <PieChart className="text-sky-500 w-5 h-5" />
                  <span>Análisis Operativo Mensual</span>
                </h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-semibold text-slate-500 dark:text-slate-400">
                  {monthName} 2026
                </span>
              </div>
              <div className="space-y-6">
                {/* Facturación bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Facturación Real vs. Objetivo</span>
                    <span className="font-bold text-sky-500">{factReal === null ? "Sin datos" : `${factPct}%`}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div className="bg-sky-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(Number(factPct), 100)}%` }} />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                    <span>{formatValueText(factReal)}</span>
                    <span>{factObj ? `Meta: ${formatValueText(factObj)}` : "Meta no presupuestada"}</span>
                  </div>
                </div>
                {/* Cobranza bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Cobranza Real vs. Objetivo</span>
                    <span className="font-bold text-emerald-500">{cobReal === null ? "Sin datos" : `${cobPct}%`}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(Number(cobPct), 100)}%` }} />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                    <span>{formatValueText(cobReal)}</span>
                    <span>{cobObj ? `Meta: ${formatValueText(cobObj)}` : "Meta no presupuestada"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Composición patrimonial */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
                <Wallet className="text-indigo-500 w-5 h-5" />
                <span>Composición Patrimonial del Mes</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Caja, Bancos & FCI", value: caja + fci, note: "Disponibilidad líquida inmediata", semColor: liqInmColor },
                  { label: "Cheques Cartera",    value: cheques,    note: "Instrumentos negociables",          semColor: "bg-green-500" },
                  { label: "Cuentas por Cobrar", value: deudores,   note: `Top 20 Deudores: ${formatValueText(companyData.activoCorriente.top20Deudores[selectedMonthIdx])}`, semColor: deudColor },
                ].map(({ label, value, note, semColor }) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
                      <span className={`w-3 h-3 rounded-full ${semColor}`} />
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{formatValueText(value)}</p>
                    <p className="text-xs text-slate-500 mt-1">{note}</p>
                  </div>
                ))}
              </div>

              {/* Doughnut + breakdown */}
              <div className="mt-6 flex flex-col md:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <div className="w-full md:w-1/2 h-56 flex items-center justify-center">
                  <canvas ref={assetCanvasRef} />
                </div>
                <div className="w-full md:w-1/2 space-y-3 mt-4 md:mt-0 md:pl-6 text-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50 pb-2">
                    <span className="font-medium">Total Activo Corriente</span>
                    <span className="font-bold text-brand-600 dark:text-sky-400">{formatValueText(actCorr)}</span>
                  </div>
                  {[
                    { label: "Caja y Bancos",     color: "bg-sky-500",    val: pct(caja) },
                    { label: "Cheques Cartera",   color: "bg-indigo-500", val: pct(cheques) },
                    { label: "Deudores Ventas",   color: "bg-amber-500",  val: pct(deudores) },
                    { label: "Plazos Fijos & FCI",color: "bg-teal-500",   val: pct(plazoFijo + fci) },
                  ].map(({ label, color, val }) => (
                    <div key={label} className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center">
                        <span className={`w-2.5 h-2.5 rounded-full ${color} mr-2`} />{label}
                      </span>
                      <span className="font-semibold">{val}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-8">
            {/* Diagnóstico */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 mb-4 text-brand-500">
                <ClipboardCheck className="w-5 h-5" />
                <h3 className="text-lg font-bold">Diagnóstico Financiero</h3>
              </div>
              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                {factReal === null && cobReal === null ? (
                  <div className="flex items-start space-x-3 text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Periodo sin datos registrados</p>
                      <p className="text-xs mt-1">No existen registros operativos para <strong>{monthName}</strong>.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="leading-relaxed">Durante <strong>{monthName}</strong>, la empresa presenta el siguiente comportamiento:</p>
                    <div className="space-y-3">
                      {[
                        { sem: factSem, title: `Facturación: ${factSem.label}`, detail: `Facturado: ${formatValueText(factReal)} frente a objetivo de ${formatValueText(factObj)}. Cumplimiento del ${factCumpl || "0,00%"}.` },
                        { sem: cobSem,  title: `Cobranzas: ${cobSem.label}`,    detail: `Recaudado: ${formatValueText(cobReal)} frente a objetivo de ${formatValueText(cobObj)}. Cumplimiento del ${cobCumpl || "0,00%"}.` },
                        { sem: { bg: parseFloat(ratioLiquidez) >= 1.5 ? "bg-emerald-500" : "bg-rose-500" }, title: `Ratio Liquidez: ${parseFloat(ratioLiquidez) >= 1.5 ? "Fuerte" : "Ajustado"} (${ratioLiquidez}x)`, detail: `Activo corriente de ${formatValueText(actCorr)} respalda el pasivo de ${formatValueText(pasCorr)}.` },
                      ].map(({ sem, title, detail }, i) => (
                        <div key={i} className="flex items-start space-x-2">
                          <span className={`w-2 h-2 rounded-full mt-2 ${sem.bg}`} />
                          <div>
                            <span className="font-semibold block">{title}</span>
                            <span className="text-xs text-slate-500">{detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recomendación */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
                <h3 className="text-lg font-bold text-white">Recomendación Wara GPS</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                El mes de <span className="text-indigo-200 font-semibold">{monthName.toLowerCase()}</span> presenta una excelente recuperación en{" "}
                <span className="font-semibold text-emerald-300">Cobranzas ({formatValueText(cobReal)})</span> impulsado probablemente por un récord de facturación anterior.
                Sin embargo, el <span className="font-semibold text-rose-300">{factPct}%</span> de cumplimiento en facturación sugiere que el esfuerzo de prospección debe redoblarse.
              </p>
              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 space-y-2 text-xs">
                <div className="flex items-start space-x-2 text-indigo-200">
                  <span className="bg-indigo-500/20 px-1.5 py-0.5 rounded font-bold text-indigo-400">1</span>
                  <span><strong>Movilizar Activos:</strong> Invertir la caja ociosa en FCI o plazos fijos remunerados a corto plazo.</span>
                </div>
                <div className="flex items-start space-x-2 text-indigo-200">
                  <span className="bg-indigo-500/20 px-1.5 py-0.5 rounded font-bold text-indigo-400">2</span>
                  <span><strong>Facturas por Cobrar:</strong> Los deudores por ventas representan {formatValueText(deudores)}. Plan de cobro intensivo.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TAB 2: Gráficos ──────────────────────────────────────────────── */}
      <section className={activeTab === "tab-charts" ? "block" : "hidden"}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <LineChart className="text-sky-500 w-5 h-5" />
              <span>Tendencia de Facturación vs Cobranzas (2026)</span>
            </h3>
            <div className="h-80 w-full"><canvas ref={trendsCanvasRef} /></div>
            <p className="text-xs text-slate-500 mt-4 italic">* Los errores del excel de los primeros meses se filtraron para mantener la integridad de la curva.</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <ShieldCheck className="text-emerald-500 w-5 h-5" />
              <span>Estructura de Capital y Solvencia</span>
            </h3>
            <div className="h-80 w-full"><canvas ref={solvencyCanvasRef} /></div>
            <p className="text-xs text-slate-500 mt-4 italic">* Comparación entre activos corrientes disponibles contra las obligaciones operativas a corto y largo plazo.</p>
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
            <Layers className="text-amber-500 w-5 h-5" />
            <span>Composición de Facturación por Canal (2026)</span>
          </h3>
          {hasCompMix ? (
            <div className="h-80 w-full"><canvas ref={compositionCanvasRef} /></div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">
              <div className="text-center">
                <p className="font-semibold">Sin datos de composición disponibles</p>
                <p className="text-xs mt-1">Importá un Excel que incluya las filas &quot;Ratio Abonos&quot;, &quot;Ratio Instalaciones&quot; y &quot;Ratio Otros&quot;.</p>
              </div>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-4 italic">* Distribución porcentual de la facturación por canal: Abonos recurrentes, Instalaciones y Envíos/Otros.</p>
        </div>
      </section>

      {/* ── TAB 3: Semáforos ─────────────────────────────────────────────── */}
      <section className={activeTab === "tab-semaphores" ? "block" : "hidden"}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <TrafficCone className="w-6 h-6 text-sky-500" />
            <div>
              <h3 className="text-lg font-bold">Configuración de Reglas de Semáforos Financieros</h3>
              <p className="text-sm text-slate-500">Definiciones operacionales y umbrales diseñados para Wara GPS para auditar el desempeño financiero.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { title: "Cumplimiento de Objetivos (Facturación/Cobranza)", color: "bg-sky-500", desc: "Mide la efectividad real en contraste con la planificación presupuestaria de la dirección.", rules: [{ l: "Verde (Excelente)", v: "≥ 95%", c: "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300" }, { l: "Amarillo (Alerta/Estable)", v: "80% - 94.9%", c: "bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" }, { l: "Rojo (Crítico)", v: "< 80%", c: "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300" }] },
              { title: "Variación Intermensual (m/m)", color: "bg-emerald-500", desc: "Evalúa la aceleración o desaceleración comercial del flujo de caja real respecto al mes anterior.", rules: [{ l: "Verde (Expansión)", v: "> 5%", c: "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300" }, { l: "Amarillo (Estable)", v: "-5% a +5%", c: "bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" }, { l: "Rojo (Contracción)", v: "< -5%", c: "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300" }] },
              { title: "Ratio de Liquidez Corriente (Solvencia CP)", color: "bg-purple-500", desc: "Mide cuántos pesos de activo de corto plazo se tienen por cada peso de pasivo inmediato.", rules: [{ l: "Verde (Excelente Solvencia)", v: "Ratio ≥ 1.5", c: "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300" }, { l: "Amarillo (Liquidez Ajustada)", v: "1.0 - 1.49", c: "bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" }, { l: "Rojo (Riesgo Financiero)", v: "< 1.0", c: "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300" }] },
              { title: "Composición de la Caja (Salud Inmediata)", color: "bg-amber-500", desc: "Mide la proporción de disponibilidad líquida inmediata frente al total de activos corrientes.", rules: [{ l: "Verde (Excelente disponibilidad)", v: "≥ 20%", c: "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300" }, { l: "Amarillo (Suficiente / Conservador)", v: "10% - 19.9%", c: "bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" }, { l: "Rojo (Caja Crítica)", v: "< 10%", c: "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300" }] },
            ].map(({ title, color, desc, rules }) => (
              <div key={title} className="border border-slate-100 dark:border-slate-700 rounded-xl p-5 space-y-3 bg-slate-50 dark:bg-slate-900/30">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center">
                  <span className={`w-3 h-3 rounded-full ${color} mr-2`} />{title}
                </h4>
                <p className="text-xs text-slate-500">{desc}</p>
                <div className="space-y-2 text-sm">
                  {rules.map(({ l, v, c }) => (
                    <div key={l} className={`flex justify-between items-center ${c} p-2 rounded`}>
                      <span>{l}</span><span className="font-bold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TAB 4: Matriz ────────────────────────────────────────────────── */}
      <section className={activeTab === "tab-table" ? "block" : "hidden"}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h3 className="text-lg font-bold">Matriz de Datos Financieros 2026</h3>
              <p className="text-sm text-slate-500">Métricas consolidadas de Facturación, Cobranza, Activos y Pasivos de la empresa.</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 rounded-xl px-4 py-2 text-xs font-semibold flex items-center space-x-2">
              <Info className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Las celdas con errores de Excel muestran automáticamente <strong>&quot;trabajando datos&quot;</strong>.</span>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 border-b border-slate-100 dark:border-slate-700 uppercase tracking-wider text-xs">
                  <th className="p-4 font-bold sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 min-w-[220px]">Indicador / Cuenta</th>
                  {["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"].map((m, i) => (
                    <th key={m} className={`p-4 font-bold text-center ${i === selectedMonthIdx ? "font-semibold bg-indigo-50 dark:bg-indigo-950/20 border-x border-slate-200 dark:border-slate-700" : ""}`}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {MATRIX_ROWS.map((r, ri) =>
                  r.isHeader ? (
                    <tr key={ri} className="bg-slate-100/50 dark:bg-slate-900/50 font-bold text-slate-900 dark:text-slate-100 uppercase text-xs tracking-wider border-y border-slate-200 dark:border-slate-800">
                      <td colSpan={13} className="p-3 pl-4">{r.label}</td>
                    </tr>
                  ) : (
                    <tr key={ri} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${r.sectionBreak ? "border-t-2 border-slate-200 dark:border-slate-700" : ""}`}>
                      <td className={`p-3 pl-4 font-medium sticky left-0 bg-white dark:bg-slate-800 z-10 ${r.indent ? "pl-8 text-slate-500 dark:text-slate-400 text-xs" : ""} ${r.bold ? "font-semibold text-slate-900 dark:text-white" : ""}`}>
                        {r.label}
                      </td>
                      {Array.from({ length: 12 }, (_, mIdx) => (
                        <MatrixCell key={mIdx} val={getNestedValue(companyData, r.key, mIdx)} type={r.type} isActive={mIdx === selectedMonthIdx} />
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 mt-12 py-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Blo, bienestar, logística y organización S.A. Todos los derechos reservados.</p>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-slate-500">Términos de servicio</a>
            <a href="#" className="hover:text-slate-500">Políticas de seguridad</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
