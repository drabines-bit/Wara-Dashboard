"use client";

import { useState, useEffect, useRef } from "react";
import { generateMonthlyReport } from '@/lib/generatePDF';
import { Chart, registerables } from "chart.js";
import Link from "next/link";
import { fmtCurrency, fmtPercent, fmtNumber } from '@/lib/format';
import ProyeccionAnual from '@/components/ProyeccionAnual';
import NotaMensual from '@/components/NotaMensual';
import OdooPanel from '@/components/OdooPanel';
import PnlPanel from '@/components/PnlPanel';
import PresentationMode from '@/components/PresentationMode';
import TVMode from '@/components/TVMode';
import {
  DollarSign, CreditCard, Percent, Activity, LayoutDashboard,
  TrendingUp, TrafficCone, Table2, PieChart, Wallet, LineChart,
  ShieldCheck, Layers, ClipboardCheck, Sparkles, Info,
  AlertTriangle, CheckCircle, X, Moon, Sun,
} from "lucide-react";

Chart.register(...registerables);

const TV_CARDS_DEFAULT = [
  'cumplimientoFacturacion', 'cumplimientoCobranza', 'variacionFacturacion',
  'liquidez', 'inflacion', 'dolarOficial',
];

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
  if (typeof val === "string") return val;
  if (type === "currency") return fmtCurrency(val);
  if (type === "percent")  return fmtPercent(val);
  return fmtNumber(val);
}

function formatCustomValue(val, dataType) {
  if (val === null || val === undefined) return '–';
  if (typeof val === 'string') return val;
  if (dataType === 'currency') return fmtCurrency(val);
  if (dataType === 'percent')  return fmtPercent(val);
  return fmtNumber(val);
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
function MatrixCell({ val, type = "currency", isActive, fmt = formatValueText }) {
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
    content = fmt(val, type);
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

export default function DashboardClient({ initialData, config, isAdmin, initialNotas, year, lastSync }) {
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
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [currency,         setCurrency]         = useState('ARS');
  const [rates,            setRates]            = useState(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [tvMode,           setTvMode]           = useState(false);
  const [notas,    setNotas]    = useState(initialNotas ?? {});
  const [pinned,   setPinned]   = useState(false);

  function handleNotaSaved(mes, texto) {
    setNotas(prev => {
      const next = { ...prev };
      if (texto?.trim()) {
        next[String(mes)] = texto.trim();
      } else {
        delete next[String(mes)];
      }
      return next;
    });
  }

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

  useEffect(() => {
    fetch('/api/cotizaciones')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setRates(d); })
      .catch(() => {});
  }, []);

  // Restore saved initial period from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('wara:periodoInicial');
    if (saved === null) return;
    const idx = parseInt(saved, 10);
    if (!isNaN(idx) && idx >= 0 && idx < companyData.months.length) {
      setSelectedMonthIdx(idx);
    }
  }, []);

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
      const labels = [], activeIdxs = [], factArr = [], cobArr = [];
      companyData.months.forEach((m, i) => {
        if (companyData.facturacion.real[i] !== null || companyData.cobranza.real[i] !== null) {
          labels.push(m);
          activeIdxs.push(i);
          factArr.push(companyData.facturacion.real[i]);
          cobArr.push(companyData.cobranza.real[i]);
        }
      });
      const customDatasets = (config?.customVariables ?? [])
        .filter(cv => cv.enabled && cv.showInChart)
        .map(cv => ({
          label: cv.displayName,
          data: activeIdxs.map(i => companyData.custom?.[cv.id]?.[i] ?? null),
          borderColor: cv.chartColor,
          backgroundColor: cv.chartColor + '20',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          spanGaps: true,
        }));
      trendsChart.current = new Chart(trendsCanvasRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: "Facturación Real", data: factArr, borderColor: "#0284c7", backgroundColor: "rgba(2,132,199,0.05)", borderWidth: 3, tension: 0.35, fill: true, pointBackgroundColor: "#0284c7" },
            { label: "Cobranza Real",    data: cobArr,  borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.05)", borderWidth: 3, tension: 0.35, fill: true, pointBackgroundColor: "#10b981" },
            ...customDatasets,
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
                  label: (ctx) => ` ${ctx.dataset.label}: ${fmtPercent(ctx.raw, 1)}`,
                  footer: (items) => `Total: ${fmtPercent(items.reduce((s, i) => s + (i.raw || 0), 0), 1)}`,
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

  const activeRate = currency === 'USD_OFICIAL' ? rates?.ars?.venta
                   : currency === 'USD_MEP'     ? rates?.mep?.venta
                   : null;

  function cvt(val, dataType) {
    if (val === null || val === undefined) return '–';
    if (typeof val === 'string') return formatValueText(val, dataType);
    if (dataType !== 'currency') return formatValueText(val, dataType);
    if (!activeRate || currency === 'ARS') return formatValueText(val, 'currency');
    const usd = val / activeRate;
    return 'US$ ' + new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(usd);
  }

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
  const ratioLiquidez  = actCorr && pasCorr ? actCorr / pasCorr : 0;

  const factSem  = getSemaphoreColor("cumplimiento", factCumpl);
  const cobSem   = getSemaphoreColor("cumplimiento", cobCumpl);
  const varSem   = getSemaphoreColor("variacion", varFact);
  const liqSem   = getSemaphoreColor("liquidez", ratioLiquidez);

  const factPct  = factObj && factReal ? (factReal / factObj) * 100 : 0;
  const cobPct   = cobObj  && cobReal  ? (cobReal  / cobObj)  * 100 : 0;

  const caja      = companyData.activoCorriente.cajaBancos[selectedMonthIdx] || 0;
  const fci       = companyData.activoCorriente.fci[selectedMonthIdx] || 0;
  const cheques   = companyData.activoCorriente.cheques[selectedMonthIdx] || 0;
  const deudores  = companyData.activoCorriente.deudores[selectedMonthIdx] || 0;
  const plazoFijo = companyData.activoCorriente.plazoFijo[selectedMonthIdx] || 0;
  const actTotal  = actCorr || 1;

  const pct = (n) => fmtNumber((n / actTotal) * 100, 2);
  const liqInmPct   = ((caja + cheques) / actTotal) * 100;
  const deudPct     = (deudores / actTotal) * 100;
  const liqInmColor = liqInmPct >= 20 ? "bg-emerald-500" : liqInmPct >= 10 ? "bg-amber-500" : "bg-rose-500";
  const deudColor   = deudPct > 50 ? "bg-rose-500" : deudPct > 30 ? "bg-amber-500" : "bg-emerald-500";

  const hasAnyData    = companyData.facturacion.real.some((v) => v !== null);
  const hasCompMix    = companyData.facturacionMix?.ratioAbonos?.some((v) => v !== null);

  const recDesc = (() => {
    if (factReal === null) return null;
    if (!factObj) return `${monthName}: facturación real ${cvt(factReal, 'currency')} — sin objetivo definido para el período.`;
    if (factPct >= 95 && cobPct >= 95)
      return `${monthName}: facturación y cobranza superan el objetivo. Doble cumplimiento confirmado.`;
    if (factPct >= 95) {
      const cobStr = cobPct >= 80 ? `en seguimiento (${fmtPercent(cobPct)})` : cobPct > 0 ? `con margen de mejora (${fmtPercent(cobPct)})` : 'sin objetivo';
      return `Facturación de ${monthName} en verde (${fmtPercent(factPct)}). Cobranza ${cobStr}.`;
    }
    if (factPct >= 80)
      return `Facturación de ${monthName} al ${fmtPercent(factPct)}: dentro del rango aceptable, con brecha respecto al objetivo.`;
    return `Facturación de ${monthName} al ${fmtPercent(factPct)}: por debajo del umbral crítico. Revisá causas y reforzá el plan comercial.`;
  })();

  const recItems = [
    (caja + fci) / (actTotal || 1) > 0.35 && {
      label: 'Caja excedente',
      detail: `${fmtPercent(((caja + fci) / actTotal) * 100)} del activo en liquidez inmediata. Considerá plazos fijos o FCI de alta liquidez.`,
    },
    deudPct > 30 && {
      label: 'Deudores elevados',
      detail: `${cvt(deudores, 'currency')} en cuentas por cobrar (${fmtPercent(deudPct)} del activo). Plan de cobro activo recomendado.`,
    },
    ratioLiquidez > 0 && ratioLiquidez < 1.5 && {
      label: 'Liquidez ajustada',
      detail: `Ratio ${fmtNumber(ratioLiquidez, 2)}x. Monitoreá los vencimientos del pasivo corriente (${cvt(pasCorr, 'currency')}).`,
    },
    cobPct > 0 && cobPct < 80 && {
      label: 'Cobranza bajo objetivo',
      detail: `${fmtPercent(cobPct)} de cumplimiento. Revisá plazos y seguimiento con los principales clientes.`,
    },
  ].filter(Boolean);

  const TABS = [
    { id: "tab-general",    label: "Vista General",                                        shortLabel: "General",    Icon: LayoutDashboard },
    { id: "tab-charts",     label: "Gráficos y Tendencias",                                shortLabel: "Gráficos",   Icon: TrendingUp      },
    { id: "tab-semaphores", label: "Reglas de Semáforos",                                  shortLabel: "Semáforos",  Icon: TrafficCone     },
    { id: "tab-table",      label: `Matriz de Datos ${year ?? new Date().getFullYear()}`,  shortLabel: "Matriz",     Icon: Table2          },
  ];

  async function handleExportPDF() {
    setGeneratingPDF(true);
    try {
      const [pnlRes, comercialRes] = await Promise.allSettled([
        fetch('/api/odoo-pnl'),
        fetch('/api/odoo'),
      ]);
      const pnlData = pnlRes.status === 'fulfilled' && pnlRes.value.ok
        ? await pnlRes.value.json() : null;
      const comercialData = comercialRes.status === 'fulfilled' && comercialRes.value.ok
        ? await comercialRes.value.json() : null;

      await generateMonthlyReport({
        companyData,
        config,
        selectedMonthIdx,
        chartRefs: {
          trends:      trendsCanvasRef?.current      ?? null,
          solvency:    solvencyCanvasRef?.current    ?? null,
          composition: compositionCanvasRef?.current ?? null,
        },
        odooData: { pnlData, comercialData },
      });
    } catch (e) {
      console.error('[PDF]', e);
      alert('Error al generar el PDF: ' + e.message);
    } finally {
      setGeneratingPDF(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {presentationMode && (
        <PresentationMode
          companyData={companyData}
          config={config}
          selectedMonthIdx={selectedMonthIdx}
          setSelectedMonthIdx={setSelectedMonthIdx}
          notas={notas}
          year={year ?? new Date().getFullYear()}
          onExit={() => setPresentationMode(false)}
        />
      )}
      {tvMode && (
        <TVMode
          companyData={companyData}
          config={config}
          lastSync={lastSync}
          onExit={() => setTvMode(false)}
          tvCards={config?.tvMode?.cards ?? TV_CARDS_DEFAULT}
        />
      )}
      {/* Controls: month selector + export + dark mode */}
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => {
              localStorage.setItem('wara:periodoInicial', String(selectedMonthIdx));
              setPinned(true);
              setTimeout(() => setPinned(false), 2000);
            }}
            title="Fijar este mes como período de apertura por defecto"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-500 transition-colors ml-2 flex-shrink-0"
          >
            <i className="ti ti-pin text-sm" aria-hidden="true" />
            {pinned
              ? <span className="text-green-500">✓ Guardado</span>
              : <span>Fijar como inicio</span>
            }
          </button>

          <button
            onClick={handleExportPDF}
            disabled={generatingPDF}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 hover:text-indigo-600 font-medium px-4 py-2 rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar reporte mensual en PDF"
          >
            {generatingPDF ? (
              <>
                <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                Preparando...
              </>
            ) : (
              <>
                <i className="ti ti-file-export text-sm" aria-hidden="true" />
                Exportar PDF
              </>
            )}
          </button>

          {/* Toggle de moneda */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs font-medium gap-0.5">
            {[
              { label: 'ARS',         shortLabel: 'ARS',     val: 'ARS'        },
              { label: 'USD Oficial', shortLabel: 'Oficial',  val: 'USD_OFICIAL' },
              { label: 'USD MEP',     shortLabel: 'MEP',      val: 'USD_MEP'     },
            ].map(({ label, shortLabel, val }) => (
              <button
                key={val}
                onClick={() => setCurrency(val)}
                title={val === 'USD_OFICIAL'
                  ? `Tipo de cambio oficial: $${rates?.ars?.venta?.toLocaleString('es-AR') ?? '...'}`
                  : val === 'USD_MEP'
                  ? `Dólar MEP: $${rates?.mep?.venta?.toLocaleString('es-AR') ?? '...'}`
                  : 'Pesos argentinos'}
                className={`px-3 py-2 sm:py-1.5 rounded-lg transition whitespace-nowrap min-h-[36px] ${
                  currency === val
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setPresentationMode(true)}
              className="flex items-center gap-2 text-sm font-medium
                         text-slate-600 dark:text-slate-400
                         hover:text-slate-900 dark:hover:text-white
                         border border-slate-200 dark:border-slate-700
                         hover:border-slate-400 dark:hover:border-slate-500
                         bg-white dark:bg-slate-800
                         px-4 py-2 rounded-xl transition"
              title="Modo presentación para directorio"
            >
              <i className="ti ti-presentation text-base" aria-hidden="true"/>
              Presentación
            </button>

            <button
              onClick={() => setTvMode(true)}
              className="flex items-center gap-2 text-sm font-medium
                         text-slate-600 dark:text-slate-400
                         hover:text-slate-900 dark:hover:text-white
                         border border-slate-200 dark:border-slate-700
                         hover:border-slate-400 dark:hover:border-slate-500
                         bg-white dark:bg-slate-800
                         px-4 py-2 rounded-xl transition"
              title="Modo TV para pantalla de la oficina"
            >
              <i className="ti ti-device-tv text-base" aria-hidden="true"/>
              Modo TV
            </button>
          </div>
        </div>

        <button
          onClick={() => { const d = !isDark; setIsDark(d); localStorage.theme = d ? "dark" : "light"; }}
          className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors focus:outline-none"
        >
          {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {currency !== 'ARS' && activeRate && (
        <p className="text-xs text-slate-400 dark:text-slate-500 -mt-4 mb-4">
          Valores convertidos al tipo de cambio{' '}
          {currency === 'USD_OFICIAL' ? 'oficial' : 'MEP'} actual:{' '}
          ${new Intl.NumberFormat('es-AR').format(activeRate)} por USD.
          Los gráficos se mantienen en ARS.
        </p>
      )}

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
        <div key={`${alert.type}-${alert.title}`} className={`animate-slide-down mb-6 p-4 rounded-xl border flex items-start space-x-3 ${
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: "Facturación Real",          value: cvt(factReal, 'currency'), subtitle: factObj ? `Objetivo: ${cvt(factObj, 'currency')}` : "Objetivo sin definir", badge: isExcelError(factCumpl) ? "trabajando datos" : `${factCumpl || "0,00%"} Cumplimiento`, badgeClass: factSem.color, Icon: DollarSign,  iconColor: "text-sky-500 bg-sky-50 dark:bg-sky-950/50" },
          { title: "Cobranza Real",              value: cvt(cobReal, 'currency'),  subtitle: cobObj  ? `Objetivo: ${cvt(cobObj, 'currency')}`  : "Objetivo sin definir", badge: isExcelError(cobCumpl) ? "trabajando datos"  : `${cobCumpl || "0,00%"} Cumplimiento`,  badgeClass: cobSem.color,  Icon: CreditCard,  iconColor: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50" },
          { title: "Variación m/m Facturación",  value: isExcelError(varFact) ? "trabajando datos" : (varFact || "0,00%"), subtitle: "Vs. mes anterior", badge: isExcelError(varFact) ? "Revisando" : (parseFloat(varFact) < 0 ? "Contracción" : "Aumento"), badgeClass: varSem.color, Icon: Percent,    iconColor: "text-amber-500 bg-amber-50 dark:bg-amber-950/50" },
          { title: "Ratio Liquidez Corriente",   value: isExcelError(actCorr) || isExcelError(pasCorr) ? "trabajando datos" : fmtNumber(ratioLiquidez, 2) + "x", subtitle: "Activo Corriente / Pasivo Corriente", badge: isExcelError(actCorr) || isExcelError(pasCorr) ? "trabajando datos" : liqSem.label, badgeClass: liqSem.color, Icon: Activity, iconColor: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50" },
        ].map((m, idx) => (
          <div key={m.title} style={{ '--kpi-i': idx }} className={`animate-kpi-stagger bg-white dark:bg-slate-800 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all ${idx === 0 ? 'p-6 shadow-sm border border-sky-100 dark:border-sky-900/30' : 'p-5 shadow-sm border border-slate-100 dark:border-slate-800/80'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-slate-500">{m.title}</span>
              <div className={`${m.iconColor} p-2.5 rounded-xl`}><m.Icon className="w-5 h-5" /></div>
            </div>
            <div className="mb-4">
              <h4 className={`${idx === 0 ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'} font-bold tracking-tight text-slate-900 dark:text-white`}>{m.value}</h4>
              <p className="text-xs text-slate-500 mt-1">{m.subtitle}</p>
            </div>
            <div className="pt-3 border-t border-slate-50 dark:border-slate-700/50">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.badgeClass}`}>{m.badge}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── KPI Cards de variables custom ── */}
      {(config?.customVariables ?? []).filter(cv => cv.enabled && cv.showAsKPI).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(config?.customVariables ?? [])
            .filter(cv => cv.enabled && cv.showAsKPI)
            .map(cv => {
              const val = companyData.custom?.[cv.id]?.[selectedMonthIdx] ?? null;
              const hasData = val !== null && val !== undefined;
              return (
                <div key={cv.id} className="relative group animate-kpi-stagger bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-slate-500">{cv.displayName}</span>
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700">
                      <span className="w-5 h-5 block rounded-full" style={{ background: cv.chartColor }} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {hasData ? cvt(val, cv.dataType) : '–'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {cv.dataType === 'currency' ? 'Moneda local' : cv.dataType === 'percent' ? 'Porcentaje' : 'Valor numérico'}
                    </p>
                  </div>
                  {cv.tooltip && (
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                                 w-72 bg-slate-900 dark:bg-slate-950 text-white text-xs
                                 rounded-xl px-4 py-3 shadow-2xl leading-relaxed
                                 opacity-0 group-hover:opacity-100
                                 transition-opacity duration-200 pointer-events-none
                                 z-50 border border-slate-700"
                      role="tooltip"
                    >
                      {cv.tooltip}
                      <div className="absolute top-full left-1/2 -translate-x-1/2
                                      border-4 border-transparent
                                      border-t-slate-900 dark:border-t-slate-950"/>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 mb-8">
        <nav className="flex overflow-x-auto scrollbar-hide -mb-px">
          {TABS.map(({ id, label, shortLabel, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`pb-4 px-3 sm:px-4 flex-shrink-0 text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? "border-brand-500 text-brand-600 dark:text-sky-400 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── TAB 1: Vista General ─────────────────────────────────────────── */}
      {activeTab === "tab-general" && (
      <section className="animate-tab-enter">
        {/* Nota del período */}
        <NotaMensual
          nota={notas[String(selectedMonthIdx)] ?? null}
          mes={selectedMonthIdx}
          mesNombre={companyData.months[selectedMonthIdx]}
          year={year ?? new Date().getFullYear()}
          isAdmin={isAdmin}
          onSaved={handleNotaSaved}
        />

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
                    <span className="font-bold text-sky-500">{factReal === null ? "Sin datos" : fmtPercent(factPct)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div className="bg-sky-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(factPct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                    <span>{cvt(factReal, 'currency')}</span>
                    <span>{factObj ? `Meta: ${cvt(factObj, 'currency')}` : "Meta no presupuestada"}</span>
                  </div>
                </div>
                {/* Cobranza bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Cobranza Real vs. Objetivo</span>
                    <span className="font-bold text-emerald-500">{cobReal === null ? "Sin datos" : fmtPercent(cobPct)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div className="bg-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(cobPct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                    <span>{cvt(cobReal, 'currency')}</span>
                    <span>{cobObj ? `Meta: ${cvt(cobObj, 'currency')}` : "Meta no presupuestada"}</span>
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
                  { label: "Cuentas por Cobrar", value: deudores,   note: `Top 20 Deudores: ${cvt(companyData.activoCorriente.top20Deudores[selectedMonthIdx], 'currency')}`, semColor: deudColor },
                ].map(({ label, value, note, semColor }) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
                      <span className={`w-3 h-3 rounded-full ${semColor}`} />
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{cvt(value, 'currency')}</p>
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
                    <span className="font-bold text-brand-600 dark:text-sky-400">{cvt(actCorr, 'currency')}</span>
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
                        { sem: factSem, title: `Facturación: ${factSem.label}`, detail: `Facturado: ${cvt(factReal, 'currency')} frente a objetivo de ${cvt(factObj, 'currency')}. Cumplimiento del ${factCumpl || "0,00%"}.` },
                        { sem: cobSem,  title: `Cobranzas: ${cobSem.label}`,    detail: `Recaudado: ${cvt(cobReal, 'currency')} frente a objetivo de ${cvt(cobObj, 'currency')}. Cumplimiento del ${cobCumpl || "0,00%"}.` },
                        { sem: { bg: ratioLiquidez >= 1.5 ? "bg-emerald-500" : "bg-rose-500" }, title: `Ratio Liquidez: ${ratioLiquidez >= 1.5 ? "Fuerte" : "Ajustado"} (${fmtNumber(ratioLiquidez, 2)}x)`, detail: `Activo corriente de ${cvt(actCorr, 'currency')} respalda el pasivo de ${cvt(pasCorr, 'currency')}.` },
                      ].map(({ sem, title, detail }, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sem.bg}`} />
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{title}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{detail}</p>
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
              {factReal === null ? (
                <p className="text-sm text-slate-400 italic">Sin datos para este período.</p>
              ) : (
                <>
                  {recDesc && (
                    <p className="text-sm text-slate-300 leading-relaxed mb-4">{recDesc}</p>
                  )}
                  {recItems.length > 0 ? (
                    <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 space-y-2 text-xs">
                      {recItems.map(({ label, detail }, i) => (
                        <div key={i} className="flex items-start space-x-2 text-indigo-200">
                          <span className="bg-indigo-500/20 px-1.5 py-0.5 rounded font-bold text-indigo-400 flex-shrink-0">{i + 1}</span>
                          <span><strong>{label}:</strong> {detail}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 text-xs text-emerald-300">
                      <strong>Indicadores en orden.</strong> Seguí monitoreando facturación y cobranza para mantener la tendencia.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Proyección anual */}
        <ProyeccionAnual companyData={companyData} config={config} />
        <OdooPanel />
        <PnlPanel />
      </section>
      )}

      {/* ── TAB 2: Gráficos ──────────────────────────────────────────────── */}
      {activeTab === "tab-charts" && (
      <section className="animate-tab-enter">
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
      )}

      {/* ── TAB 3: Semáforos ─────────────────────────────────────────────── */}
      {activeTab === "tab-semaphores" && (
      <section className="animate-tab-enter">
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
      )}

      {/* ── TAB 4: Matriz ────────────────────────────────────────────────── */}
      {activeTab === "tab-table" && (
      <section className="animate-tab-enter">
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
                        <MatrixCell key={mIdx} val={getNestedValue(companyData, r.key, mIdx)} type={r.type} isActive={mIdx === selectedMonthIdx} fmt={cvt} />
                      ))}
                    </tr>
                  )
                )}
                {/* ── Variables personalizadas en la tabla ── */}
                {(config?.customVariables ?? []).filter(cv => cv.enabled && cv.showInMatrix).length > 0 && (
                  <>
                    <tr>
                      <td colSpan={13} className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/50">
                        Indicadores personalizados
                      </td>
                    </tr>
                    {(config?.customVariables ?? [])
                      .filter(cv => cv.enabled && cv.showInMatrix)
                      .map(cv => (
                        <tr key={cv.id} className="border-t border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-400 font-medium whitespace-nowrap sticky left-0 bg-white dark:bg-slate-800 z-10">
                            <div className="flex items-center gap-2">
                              {cv.showInChart && (
                                <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cv.chartColor }} />
                              )}
                              {cv.displayName}
                            </div>
                          </td>
                          {companyData.months.map((_, mIdx) => {
                            const val = companyData.custom?.[cv.id]?.[mIdx] ?? null;
                            return (
                              <td key={mIdx} className={`px-3 py-3 text-sm text-center whitespace-nowrap ${mIdx === selectedMonthIdx ? "bg-indigo-50/40 dark:bg-indigo-950/10 border-x border-slate-200 dark:border-slate-700/50 font-medium text-slate-900 dark:text-slate-100" : "text-slate-500"}`}>
                                {val !== null ? cvt(val, cv.dataType) : <span className="text-slate-600">–</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      )}

    </div>
  );
}
