// lib/proyeccion/generatePdfProyeccion.js
// Reporte de Proyección (18 meses) — Wara GPS / Blo S.A.
// Reusa los helpers visuales compartidos de lib/generatePDF.js (logo, header,
// footer, sectionTitle, kpiCard, paleta) en vez de duplicarlos.

import { PW, M, CW, C, loadLogoPng, pageHeader, pageFooter, sectionTitle, kpiCard } from '@/lib/generatePDF';
import { fmtCurrency, fmtPercent, fmtDateLong } from '@/lib/format';

const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const FUENTE_LABEL = { realizado: 'Realizado (IPC)', rem: 'REM', override: 'Override manual' };

function labelMes(mes) {
  const [y, m] = mes.split('-').map(Number);
  return `${MESES_ABR[m - 1]} '${String(y).slice(2)}`;
}

// Formato compacto en millones para la tabla densa de 18 meses (con fmtCurrency
// completo el monto no entra en el ancho de columna y autoTable lo corta a la mitad).
function fmtCompacto(v) {
  if (v === null || v === undefined) return '–';
  return '$' + (v / 1_000_000).toFixed(1) + 'M';
}

// Página apaisada (A4 landscape): ancho/alto efectivos para layout.
const LW = 297, LH = 210, LCW = LW - 2 * M;

const FILAS_DEVENGADO = [
  { label: 'Facturación neta',           get: (d) => d.facturacionNeta },
  { label: 'Costos fijos',               get: (d) => d.costos.fijos },
  { label: 'Costos variables (unidades)',get: (d) => d.costos.variables },
  { label: 'IIBB (% facturación)',       get: (d) => d.costos.iibb },
  { label: 'Costos totales',             get: (d) => d.costos.total },
  { label: 'Resultado devengado',        get: (d) => d.resultadoDevengado },
];

const FILAS_CAJA = [
  { label: 'Cobranza (con IVA)',         get: (d) => d.cobranzaConIva },
  { label: 'IVA cobrado (pasante)',      get: (d) => d.ivaPasante },
  { label: 'Egresos (costos)',           get: (d) => d.egresos },
  { label: 'Impuestos (IVA/Ganancias)',  get: () => null, pendiente: true },
  { label: 'Caja operativa',             get: (d) => d.cajaOperativa },
];

function sumarAnio(detalle, getFn, anio) {
  return detalle.filter((d) => d.mes.startsWith(anio)).reduce((acc, d) => acc + (getFn(d) ?? 0), 0);
}

// ── Página 1 — Portada ───────────────────────────────────────────────────────
function drawPortada(doc, mesCorridaLabel, today, kpis, logoPng) {
  doc.setFillColor(...C.navy); doc.rect(0, 0, PW, 148, 'F');
  if (logoPng) {
    doc.addImage(logoPng, 'PNG', M, 40, 65, 65 / (158 / 44));
  } else {
    doc.setTextColor(...C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(26);
    doc.text('WARA GPS', M, 55);
  }
  doc.setFillColor(...C.indigo); doc.rect(M, 73, 35, 1.5, 'F');
  doc.setTextColor(...C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(19);
  doc.text('PROYECCIÓN FINANCIERA', M, 92);
  doc.text('18 MESES', M, 103);
  doc.setFillColor(...C.indigo); doc.roundedRect(M, 112, 80, 13, 2, 2, 'F');
  doc.setTextColor(...C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text(`Corrida: ${mesCorridaLabel}`, M + 5, 121);

  let y = 168;
  for (const [label, val] of [['Fecha de generación', today], ['Empresa', 'Blo, Bienestar, Logística y Organización S.A.']]) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C.gray500);
    doc.text(label, M, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C.navy);
    doc.text(val, M, y + 6);
    y += 16;
  }

  y += 4;
  y = sectionTitle(doc, 'Indicadores clave de la proyección', y);
  const W = (CW - 6) / 2;
  kpiCard(doc, M, y, W, 30, {
    title: 'Resultado proyectado al próximo 31-dic', value: fmtCurrency(kpis.resultadoAlCierre),
    objetivo: null, cumplimiento: null, statusColor: kpis.resultadoAlCierre >= 0 ? C.green : C.red,
  });
  kpiCard(doc, M + W + 6, y, W, 30, {
    title: 'Caja operativa acumulada (18 m)', value: fmtCurrency(kpis.cajaAcumulada18m),
    objetivo: null, cumplimiento: null, statusColor: kpis.cajaAcumulada18m >= 0 ? C.green : C.red,
  });

  doc.setFillColor(...C.navy); doc.rect(0, 283, PW, 14, 'F');
  doc.setTextColor(...C.gray400); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.text('Documento confidencial · Solo para uso interno', PW / 2, 292, { align: 'center' });
}

// ── Página 2 — Gráfico (landscape) ──────────────────────────────────────────
function drawGraficoPage(doc, chartCanvas, mesCorridaLabel, logoPng) {
  pageHeader(doc, `Proyección · ${mesCorridaLabel}`, logoPng);
  let y = 24;
  y = sectionTitle(doc, 'Facturación neta vs. Cobranza vs. Resultado', y);
  if (chartCanvas) {
    try {
      const imgData = chartCanvas.toDataURL('image/png');
      const ratio = chartCanvas.height / chartCanvas.width;
      const imgH = Math.min(LCW * ratio, LH - y - 25);
      doc.addImage(imgData, 'PNG', M, y, LCW, imgH);
    } catch { /* canvas no disponible */ }
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C.gray500);
    doc.text('Gráfico disponible en la versión web del reporte (/proyeccion).', M, y + 6);
  }
}

// ── Páginas 3+ — Tabla mensual (landscape, paginada por autoTable) ─────────
function drawTablaPages(doc, autoTable, detalle, subtotalesAnuales, mesCorridaLabel, logoPng) {
  doc.addPage('a4', 'landscape');
  pageHeader(doc, `Proyección · ${mesCorridaLabel}`, logoPng);

  const columnas = [];
  for (const fila of detalle) {
    columnas.push({ tipo: 'mes', data: fila });
    if (fila.esCierreFiscal) {
      const anio = (subtotalesAnuales ?? []).find((s) => s.hasta === fila.mes)?.anio ?? fila.mes.slice(0, 4);
      columnas.push({ tipo: 'subtotal', anio });
    }
  }
  const head = ['Concepto', ...columnas.map((c) => (c.tipo === 'mes' ? labelMes(c.data.mes) : `Subt. ${c.anio}`))];

  function filasA(filas) {
    return filas.map((f) => [
      f.label,
      ...columnas.map((c) => {
        if (f.pendiente) return 'pendiente';
        const v = c.tipo === 'mes' ? f.get(c.data) : sumarAnio(detalle, f.get, c.anio);
        return fmtCompacto(v);
      }),
    ]);
  }

  const tblOpts = {
    theme: 'grid',
    styles: { fontSize: 5.5, cellPadding: 1.2, textColor: C.navy },
    headStyles: { fillColor: C.gray200, textColor: C.navy, fontSize: 5.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { halign: 'right' },
    columnStyles: { 0: { halign: 'left', cellWidth: 36, fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: C.gray50 },
    margin: { left: M, right: M, top: 22 },
    didDrawPage: () => pageHeader(doc, `Proyección · ${mesCorridaLabel}`, logoPng),
  };

  let y = 24;
  doc.setTextColor(...C.navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('P&L Devengado (montos en millones de $)', M, y);
  autoTable(doc, { ...tblOpts, startY: y + 3, head: [head], body: filasA(FILAS_DEVENGADO) });

  doc.addPage('a4', 'landscape');
  pageHeader(doc, `Proyección · ${mesCorridaLabel}`, logoPng);
  y = 24;
  doc.setTextColor(...C.navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Caja (montos en millones de $)', M, y);
  autoTable(doc, { ...tblOpts, startY: y + 3, head: [head], body: filasA(FILAS_CAJA) });
}

// ── Anexo — Supuestos (portrait) ────────────────────────────────────────────
function drawAnexoSupuestos(doc, autoTable, { senda, overridesVentas, proyectos }, mesCorridaLabel, logoPng) {
  doc.addPage('a4', 'portrait');
  pageHeader(doc, `Proyección · ${mesCorridaLabel}`, logoPng);
  let y = 24;
  y = sectionTitle(doc, 'Anexo — Supuestos', y);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.navy);
  doc.text('Inflación mensual', M, y); y += 4;
  autoTable(doc, {
    startY: y, theme: 'grid', margin: { left: M, right: M },
    styles: { fontSize: 6.5, cellPadding: 1.3 },
    headStyles: { fillColor: C.gray200, textColor: C.navy, fontStyle: 'bold' },
    head: [['Mes', '% mensual', 'Fuente']],
    body: (senda ?? []).map((s) => [labelMes(s.mes), fmtPercent(s.pct), FUENTE_LABEL[s.fuente] ?? s.fuente]),
  });
  y = doc.lastAutoTable.finalY + 8;

  if (y > 250) { doc.addPage('a4', 'portrait'); pageHeader(doc, `Proyección · ${mesCorridaLabel}`, logoPng); y = 24; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.navy);
  doc.text('Altas/Bajas — overrides mensuales', M, y); y += 4;
  const overrideEntries = Object.entries(overridesVentas ?? {}).sort(([a], [b]) => a.localeCompare(b));
  if (overrideEntries.length > 0) {
    autoTable(doc, {
      startY: y, theme: 'grid', margin: { left: M, right: M },
      styles: { fontSize: 6.5, cellPadding: 1.3 },
      headStyles: { fillColor: C.gray200, textColor: C.navy, fontStyle: 'bold' },
      head: [['Mes', 'Unidades netas (override)']],
      body: overrideEntries.map(([mes, v]) => [labelMes(mes), `${v > 0 ? '+' : ''}${v}`]),
    });
    y = doc.lastAutoTable.finalY + 8;
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.gray500);
    doc.text('Sin overrides cargados — todos los meses usan el promedio móvil histórico.', M, y);
    y += 10;
  }

  if (y > 250) { doc.addPage('a4', 'portrait'); pageHeader(doc, `Proyección · ${mesCorridaLabel}`, logoPng); y = 24; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.navy);
  doc.text('Proyectos puntuales', M, y); y += 4;
  if ((proyectos ?? []).length > 0) {
    autoTable(doc, {
      startY: y, theme: 'grid', margin: { left: M, right: M },
      styles: { fontSize: 6.5, cellPadding: 1.3 },
      headStyles: { fillColor: C.gray200, textColor: C.navy, fontStyle: 'bold' },
      head: [['Nombre', 'Monto', 'Fecha de facturación']],
      body: proyectos.map((p) => [p.nombre, fmtCurrency(p.monto), p.fechaFacturacion]),
    });
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.gray500);
    doc.text('Sin proyectos puntuales cargados.', M, y);
  }
}

// ── Función principal (exportada) ───────────────────────────────────────────
export async function generateProyeccionReport({
  detalle, subtotalesAnuales, supuestos, chartCanvas, mode = 'save',
}) {
  const { default: jsPDF }     = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  // loadLogoPng() usa document/Image (sólo navegador). En el cron headless
  // (Node, sin DOM) se omite y los helpers caen al fallback de texto "WARA GPS".
  const logoPng = typeof document !== 'undefined' ? await loadLogoPng() : null;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const mesCorridaLabel = labelMes(detalle[0].mes);
  const today = fmtDateLong(new Date());

  const primerDic = (subtotalesAnuales ?? []).find((s) => s.hasta.endsWith('-12'));
  const resultadoAlCierre = primerDic ? primerDic.resultadoDevengado : detalle[detalle.length - 1].resultadoDevengado;
  const cajaAcumulada18m = detalle.reduce((acc, d) => acc + d.cajaOperativa, 0);

  drawPortada(doc, mesCorridaLabel, today, { resultadoAlCierre, cajaAcumulada18m }, logoPng);

  doc.addPage('a4', 'landscape');
  drawGraficoPage(doc, chartCanvas, mesCorridaLabel, logoPng);

  drawTablaPages(doc, autoTable, detalle, subtotalesAnuales, mesCorridaLabel, logoPng);

  drawAnexoSupuestos(doc, autoTable, supuestos ?? {}, mesCorridaLabel, logoPng);

  // Pie de página en todas menos la portada
  const total = doc.internal.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    pageFooter(doc, p - 1, total - 1, 'Proyección', mesCorridaLabel);
  }

  if (mode === 'save' || mode === undefined) {
    doc.save(`proyeccion-wara-gps-${detalle[0].mes}.pdf`);
    return;
  }
  if (mode === 'base64') {
    try {
      const dataUri = doc.output('datauristring');
      return dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
    } catch (e) {
      console.error('[generatePdfProyeccion base64]', e);
      return null;
    }
  }
  if (mode === 'blob') return doc.output('blob');
}
