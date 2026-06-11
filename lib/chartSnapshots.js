"use client";
// lib/chartSnapshots.js
// Renderiza los gráficos del dashboard en canvas fuera de pantalla para que el PDF
// los incluya siempre (export y envío por email), sin depender de la pestaña activa.
// Usa tema claro fijo porque el PDF se imprime sobre fondo blanco.

import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const SNAP_W = 900;
const SNAP_H = 380;

const TEXT = '#475569';
const GRID = 'rgba(100, 116, 139, 0.12)';
const FONT = { family: 'Plus Jakarta Sans' };

const BASE = {
  responsive: false,
  animation: false,
  devicePixelRatio: 2,
};

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = SNAP_W;
  c.height = SNAP_H;
  return c;
}

function legend() {
  return { position: 'top', labels: { color: TEXT, font: { ...FONT, size: 12, weight: '500' } } };
}

function moneyScales() {
  return {
    x: { grid: { display: false }, ticks: { color: TEXT, font: FONT } },
    y: { grid: { color: GRID }, ticks: { color: TEXT, font: FONT, callback: (v) => '$' + (v / 1000000) + 'M' } },
  };
}

export function renderChartSnapshots(companyData, config) {
  const charts = [];
  let trends = null, solvency = null, composition = null;

  // ── Tendencias: Facturación vs Cobranza ────────────────────────────────
  {
    const labels = [], activeIdxs = [], factArr = [], cobArr = [];
    companyData.months.forEach((m, i) => {
      if (companyData.facturacion.real[i] !== null || companyData.cobranza.real[i] !== null) {
        labels.push(m);
        activeIdxs.push(i);
        factArr.push(companyData.facturacion.real[i]);
        cobArr.push(companyData.cobranza.real[i]);
      }
    });
    if (labels.length > 0) {
      const customDatasets = (config?.customVariables ?? [])
        .filter(cv => cv.enabled && cv.showInChart)
        .map(cv => ({
          label: cv.displayName,
          data: activeIdxs.map(i => companyData.custom?.[cv.id]?.[i] ?? null),
          borderColor: cv.chartColor,
          backgroundColor: cv.chartColor + '20',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.4,
          spanGaps: true,
        }));
      trends = makeCanvas();
      charts.push(new Chart(trends, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Facturación Real', data: factArr, borderColor: '#0284c7', backgroundColor: 'rgba(2,132,199,0.05)', borderWidth: 3, tension: 0.35, fill: true, pointBackgroundColor: '#0284c7' },
            { label: 'Cobranza Real',    data: cobArr,  borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.05)', borderWidth: 3, tension: 0.35, fill: true, pointBackgroundColor: '#10b981' },
            ...customDatasets,
          ],
        },
        options: { ...BASE, plugins: { legend: legend() }, scales: moneyScales() },
      }));
    }
  }

  // ── Solvencia: Activo vs Pasivo total ──────────────────────────────────
  {
    const labels = [], activoTotalArr = [], pasivoTotalArr = [];
    companyData.months.forEach((m, i) => {
      const ac  = companyData.activoCorriente.total[i];
      const anc = companyData.activoNoCorriente.total[i];
      if (ac !== null || anc !== null) {
        labels.push(m);
        activoTotalArr.push((ac ?? 0) + (anc ?? 0));
        pasivoTotalArr.push(
          (companyData.pasivoCorriente.total[i]   ?? 0) +
          (companyData.pasivoNoCorriente.total[i] ?? 0)
        );
      }
    });
    if (labels.length > 0) {
      solvency = makeCanvas();
      charts.push(new Chart(solvency, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Activo Total', data: activoTotalArr, backgroundColor: 'rgba(99, 102, 241, 0.85)', borderRadius: 6 },
            { label: 'Pasivo Total', data: pasivoTotalArr, backgroundColor: 'rgba(249, 115, 22, 0.85)', borderRadius: 6 },
          ],
        },
        options: { ...BASE, plugins: { legend: legend() }, scales: moneyScales() },
      }));
    }
  }

  // ── Composición de facturación por canal ───────────────────────────────
  {
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
      composition = makeCanvas();
      charts.push(new Chart(composition, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Abonos Recurrentes', data: abonosArr, backgroundColor: '#0284c7', borderRadius: 4, stack: 'total' },
            { label: 'Instalaciones',      data: instalArr, backgroundColor: '#f59e0b', borderRadius: 4, stack: 'total' },
            { label: 'Envíos / Otros',     data: otrosArr,  backgroundColor: '#14b8a6', borderRadius: 4, stack: 'total' },
          ],
        },
        options: {
          ...BASE,
          plugins: { legend: legend() },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { color: TEXT, font: FONT } },
            y: { stacked: true, min: 0, max: 105, grid: { color: GRID }, ticks: { color: TEXT, font: FONT, callback: (v) => v + '%' } },
          },
        },
      }));
    }
  }

  return {
    trends,
    solvency,
    composition,
    destroy() { charts.forEach(c => c.destroy()); },
  };
}
