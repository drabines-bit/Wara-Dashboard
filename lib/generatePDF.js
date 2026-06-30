// lib/generatePDF.js
// Reporte financiero mensual — Wara GPS / Blo S.A.

import { WARA_LOGO_BASE64 } from '@/lib/logo';
import { fmtCurrency, fmtPercent, fmtNumber, fmtDateLong } from '@/lib/format';

// ── Constantes ────────────────────────────────────────────────────────────────
const PDF_SECTIONS_DEFAULT = ['kpis', 'balance', 'graficos', 'matriz'];

export const PW = 210, PH = 297, M = 14, CW = 182;
// SVG viewBox is 158 × 44
export const LOGO_RATIO = 158 / 44;

export const C = {
  navy:   [15, 23, 42],   indigo: [79, 70, 229],
  white:  [255,255,255],  gray50: [248,250,252],
  gray100:[241,245,249],  gray200:[226,232,240],
  gray400:[148,163,184],  gray500:[100,116,139],
  gray600:[71, 85, 105],  green:  [5,  150,105],
  amber:  [217,119,6],    red:    [225,29, 72],
  indigo2:[49, 46, 129],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Converts the SVG string to a PNG data URL via canvas (jsPDF doesn't accept SVG).
// Returns null on any failure so callers can fall back to text.
export async function loadLogoPng() {
  return new Promise((resolve) => {
    try {
      const b64 = WARA_LOGO_BASE64;
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = 316; c.height = 88; // 2× native size for sharpness
          c.getContext('2d').drawImage(img, 0, 0, 316, 88);
          resolve(c.toDataURL('image/png'));
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = b64;
    } catch { resolve(null); }
  });
}

function fmt(val, type) {
  if (val === null || val === undefined) return '–';
  if (typeof val === 'string') return val;
  if (type === 'currency') return fmtCurrency(val);
  if (type === 'percent')  return fmtPercent(val);
  return fmtNumber(val, 2);
}

function semColor(type, val, config) {
  if (val === null || val === undefined) return C.gray400;
  const n = typeof val === 'number' ? val
    : parseFloat(String(val).replace(/[$\s.]/g,'').replace(',','.').replace('%',''));
  if (isNaN(n)) return C.gray400;
  const s = config?.semaphores ?? {};
  if (type === 'cumplimiento') {
    const { verde=95, amarillo=80 } = s.cumplimiento ?? {};
    return n >= verde ? C.green : n >= amarillo ? C.amber : C.red;
  }
  if (type === 'variacion') {
    const { verde=5, rojo=-5 } = s.variacion ?? {};
    return n > verde ? C.green : n >= rojo ? C.amber : C.red;
  }
  if (type === 'liquidez') {
    const { verde=1.5, amarillo=1.0 } = s.liquidez ?? {};
    return n >= verde ? C.green : n >= amarillo ? C.amber : C.red;
  }
  return C.gray400;
}

function statusLabel(color) {
  if (color === C.green) return 'Verde';
  if (color === C.amber) return 'Amarillo';
  if (color === C.red)   return 'Rojo';
  return '–';
}

// ── Elementos comunes ─────────────────────────────────────────────────────────

// logoPng is a pre-computed PNG data URL (or null for text fallback).
// Keeping this synchronous so it can be called from autoTable's didDrawPage callback.
// Usa las dimensiones reales de la página actual (doc.internal.pageSize), no las
// constantes PW/PH fijas, para funcionar igual en páginas portrait y landscape.
export function pageHeader(doc, sub, logoPng) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 16, 'F');
  if (logoPng) {
    // 10 mm tall, width proportional to the 158:44 viewBox
    doc.addImage(logoPng, 'PNG', M, 3, 10 * LOGO_RATIO, 10);
  } else {
    doc.setTextColor(...C.white); doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.text('WARA GPS', M, 10);
  }
  doc.setTextColor(...C.white); doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
  doc.text(sub, pw - M, 10, { align:'right' });
}

export function pageFooter(doc, n, total, month, year) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(...C.gray100);
  doc.rect(0, ph - 10, pw, 10, 'F');
  doc.setTextColor(...C.gray500); doc.setFont('helvetica','normal'); doc.setFontSize(7);
  doc.text('Blo, Bienestar, Logística y Organización S.A.', M, ph - 4);
  doc.text(`Reporte ${month} ${year} · Confidencial`, pw/2, ph - 4, { align:'center' });
  doc.text(`Pág. ${n} de ${total}`, pw - M, ph - 4, { align:'right' });
}

export function sectionTitle(doc, text, y) {
  doc.setFillColor(...C.indigo); doc.rect(M, y, 3, 6, 'F');
  doc.setTextColor(...C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text(text, M + 5, y + 5);
  return y + 12;
}

export function kpiCard(doc, x, y, w, h, { title, value, objetivo, cumplimiento, statusColor }) {
  doc.setFillColor(...C.gray50); doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setFillColor(...statusColor); doc.roundedRect(x, y, 3, h, 1, 1, 'F');
  doc.setTextColor(...C.gray500); doc.setFont('helvetica','normal'); doc.setFontSize(6.5);
  doc.text(title.toUpperCase(), x + 6, y + 5.5);
  doc.setTextColor(...C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(12);
  doc.text(String(value), x + 6, y + 14);
  if (objetivo) {
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...C.gray500);
    doc.text(`Objetivo: ${objetivo}`, x + 6, y + 20.5);
  }
  if (cumplimiento !== null && cumplimiento !== undefined) {
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...statusColor);
    const label = typeof cumplimiento === 'number'
      ? `${fmtPercent(cumplimiento)} cumplimiento`
      : String(cumplimiento);
    doc.text(label, x + 6, y + 27);
  }
}

// ── PORTADA ───────────────────────────────────────────────────────────────────

function drawCover(doc, month, year, today, logoPng) {
  doc.setFillColor(...C.navy); doc.rect(0, 0, PW, PH / 2, 'F');
  // Logo o texto fallback
  if (logoPng) {
    // 65 mm wide, height proportional to 158:44
    doc.addImage(logoPng, 'PNG', M, 40, 65, 65 / LOGO_RATIO);
  } else {
    doc.setTextColor(...C.white); doc.setFont('helvetica','bold'); doc.setFontSize(26);
    doc.text('WARA GPS', M, 55);
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(...C.gray400);
    doc.text('Business Intelligence & Finance', M, 65);
  }
  // Línea accent
  doc.setFillColor(...C.indigo); doc.rect(M, 73, 35, 1.5, 'F');
  // Título del reporte
  doc.setTextColor(...C.white); doc.setFont('helvetica','bold'); doc.setFontSize(19);
  doc.text('REPORTE FINANCIERO', M, 92);
  doc.text('MENSUAL', M, 103);
  // Badge período
  doc.setFillColor(...C.indigo); doc.roundedRect(M, 112, 68, 13, 2, 2, 'F');
  doc.setTextColor(...C.white); doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text(`${month} ${year}`, M + 5, 121);
  // Info (mitad blanca)
  const infoY = (rows) => {
    let y = 168;
    for (const [label, val] of rows) {
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.gray500);
      doc.text(label, M, y);
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...C.navy);
      doc.text(val, M, y + 6);
      y += 18;
    }
  };
  infoY([
    ['Período cubierto', `${month} ${year}`],
    ['Fecha de generación', today],
    ['Empresa', 'Blo, Bienestar, Logística y Organización S.A.'],
  ]);
  // Bottom bar
  doc.setFillColor(...C.navy); doc.rect(0, PH - 14, PW, 14, 'F');
  doc.setTextColor(...C.gray400); doc.setFont('helvetica','normal'); doc.setFontSize(7);
  doc.text('Documento confidencial · Solo para uso interno', PW/2, PH - 5, { align:'center' });
}

// ── INDICADORES CLAVE ─────────────────────────────────────────────────────────

function drawKPIPage(doc, autoTable, data, config, mIdx, month, year, logoPng) {
  pageHeader(doc, `Indicadores Clave · ${month} ${year}`, logoPng);
  let y = 24;
  y = sectionTitle(doc, '1. Indicadores Clave', y);

  const real     = data.facturacion.real[mIdx];
  const varFact  = data.facturacion.variacion[mIdx];
  const objFact  = data.facturacion.objetivo[mIdx];
  const cumplF   = data.facturacion.cumplimiento[mIdx];
  const realCob  = data.cobranza.real[mIdx];
  const objCob   = data.cobranza.objetivo[mIdx];
  const cumplC   = data.cobranza.cumplimiento[mIdx];
  const actC     = data.activoCorriente.total[mIdx];
  const pasC     = data.pasivoCorriente.total[mIdx];
  const liq      = (actC && pasC && pasC > 0) ? actC / pasC : null;

  const W = (CW - 6) / 2;
  const H = 32;

  kpiCard(doc, M, y, W, H, {
    title: config?.labels?.facturacion ?? 'Facturación Real',
    value: fmt(real, 'currency'), objetivo: fmt(objFact,'currency'),
    cumplimiento: cumplF, statusColor: semColor('cumplimiento', cumplF, config),
  });
  kpiCard(doc, M + W + 6, y, W, H, {
    title: config?.labels?.cobranza ?? 'Cobranza Real',
    value: fmt(realCob,'currency'), objetivo: fmt(objCob,'currency'),
    cumplimiento: cumplC, statusColor: semColor('cumplimiento', cumplC, config),
  });
  y += H + 5;
  kpiCard(doc, M, y, W, H, {
    title: config?.labels?.variacion ?? 'Variación M/M',
    value: varFact !== null ? fmtPercent(varFact) : '–',
    objetivo: null, cumplimiento: null,
    statusColor: semColor('variacion', varFact, config),
  });
  kpiCard(doc, M + W + 6, y, W, H, {
    title: config?.labels?.liquidez ?? 'Ratio Liquidez',
    value: liq !== null ? `${fmtNumber(liq, 2)}x` : '–',
    objetivo: null, cumplimiento: null,
    statusColor: semColor('liquidez', liq, config),
  });
  y += H + 6;

  // Custom KPIs
  const customKPIs = (config?.customVariables ?? []).filter(cv => cv.enabled && cv.showAsKPI);
  if (customKPIs.length > 0) {
    y = sectionTitle(doc, 'Indicadores personalizados', y);
    let col = 0;
    for (const cv of customKPIs) {
      const val = data.custom?.[cv.id]?.[mIdx] ?? null;
      kpiCard(doc, col === 0 ? M : M + W + 6, y, W, H, {
        title: cv.displayName, value: fmt(val, cv.dataType),
        objetivo: null, cumplimiento: null, statusColor: C.indigo,
      });
      col++;
      if (col === 2) { col = 0; y += H + 5; }
    }
    if (col === 1) y += H + 5;
    y += 3;
  }

  // Diagnóstico
  y = sectionTitle(doc, 'Diagnóstico del período', y);
  const diag = [
    { label: config?.labels?.facturacion ?? 'Facturación', val: real, cumpl: cumplF, type: 'cumplimiento',
      detail: `${fmt(real,'currency')} vs objetivo ${fmt(objFact,'currency')} · ${cumplF !== null ? fmtPercent(cumplF) : '–'} cumplimiento` },
    { label: config?.labels?.cobranza ?? 'Cobranza', val: realCob, cumpl: cumplC, type: 'cumplimiento',
      detail: `${fmt(realCob,'currency')} vs objetivo ${fmt(objCob,'currency')} · ${cumplC !== null ? fmtPercent(cumplC) : '–'} cumplimiento` },
    { label: config?.labels?.variacion ?? 'Variación M/M', val: varFact, cumpl: varFact, type: 'variacion',
      detail: varFact !== null ? `${fmtPercent(varFact)} vs mes anterior` : 'Sin datos' },
    { label: config?.labels?.liquidez ?? 'Ratio Liquidez', val: liq, cumpl: liq, type: 'liquidez',
      detail: liq !== null ? `${fmtNumber(liq, 2)}x (Activo Cte / Pasivo Cte)` : 'Sin datos' },
  ];
  for (const item of diag) {
    if (item.val === null) continue;
    const color = semColor(item.type, item.cumpl, config);
    const bg = color.map(c => Math.round(c * 0.12 + 225));
    doc.setFillColor(...bg); doc.roundedRect(M, y, CW, 9, 1, 1, 'F');
    doc.setFillColor(...color); doc.circle(M + 5, y + 4.5, 2.2, 'F');
    doc.setTextColor(...C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text(item.label + ':', M + 10, y + 5.5);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...C.gray600);
    doc.text(item.detail, M + 42, y + 5.5);
    y += 12;
  }
}

// ── POSICIÓN PATRIMONIAL ───────────────────────────────────────────────────────

function drawBalancePage(doc, autoTable, data, config, mIdx, month, year, logoPng) {
  pageHeader(doc, `Posición Patrimonial · ${month} ${year}`, logoPng);
  let y = 24;
  y = sectionTitle(doc, '2. Posición Patrimonial', y);

  const actC = data.activoCorriente.total[mIdx];
  const pasC = data.pasivoCorriente.total[mIdx];
  const pasNC = data.pasivoNoCorriente.total[mIdx];
  const liq   = (actC && pasC && pasC > 0) ? actC / pasC : null;

  const tblOpts = {
    theme: 'grid',
    bodyStyles: { fontSize: 7.5, textColor: C.navy },
    alternateRowStyles: { fillColor: C.gray50 },
    columnStyles: { 0:{ cellWidth:120 }, 1:{ cellWidth:62, halign:'right' } },
    margin: { left:M, right:M },
  };

  autoTable(doc, { ...tblOpts, startY: y,
    head: [['Activo Corriente', fmt(actC,'currency')]],
    headStyles: { fillColor:[7,89,133], textColor:C.white, fontSize:8, fontStyle:'bold' },
    body: [
      ['Caja y Bancos',      fmt(data.activoCorriente.cajaBancos[mIdx],'currency')],
      ['FCI',                fmt(data.activoCorriente.fci[mIdx],'currency')],
      ['Cheques en cartera', fmt(data.activoCorriente.cheques[mIdx],'currency')],
      ['Deudores por ventas',fmt(data.activoCorriente.deudores[mIdx],'currency')],
      ['Plazo Fijo',         fmt(data.activoCorriente.plazoFijo[mIdx],'currency')],
    ].filter(r => r[1] !== '–'),
  });
  y = doc.lastAutoTable.finalY + 5;

  autoTable(doc, { ...tblOpts, startY: y,
    head: [['Pasivo Corriente', fmt(pasC,'currency')]],
    headStyles: { fillColor:[120,20,20], textColor:C.white, fontSize:8, fontStyle:'bold' },
    body: [
      ['Cheques pend. de pago', fmt(data.pasivoCorriente.proveedores[mIdx],'currency')],
      ['Facturas pendientes',   fmt(data.pasivoCorriente.facturasPendientes[mIdx],'currency')],
      ['Pagos comprometidos',   fmt(data.pasivoCorriente.pagosComprometidos[mIdx],'currency')],
    ].filter(r => r[1] !== '–'),
  });
  y = doc.lastAutoTable.finalY + 5;

  if (pasNC) {
    autoTable(doc, { ...tblOpts, startY: y,
      head: [['Pasivo No Corriente', fmt(pasNC,'currency')]],
      headStyles: { fillColor:[70,10,100], textColor:C.white, fontSize:8, fontStyle:'bold' },
      body: [
        ['Planes de pago ARCA', fmt(data.pasivoNoCorriente.planesArca[mIdx],'currency')],
        ['Préstamos',           fmt(data.pasivoNoCorriente.prestamos[mIdx],'currency')],
      ].filter(r => r[1] !== '–'),
    });
    y = doc.lastAutoTable.finalY + 5;
  }

  // Ratio de liquidez
  const liqColor = semColor('liquidez', liq, config);
  const liqBg = liqColor.map(c => Math.round(c * 0.1 + 230));
  doc.setFillColor(...liqBg); doc.roundedRect(M, y, CW, 20, 2, 2, 'F');
  doc.setFillColor(...liqColor); doc.roundedRect(M, y, 3, 20, 1, 1, 'F');
  doc.setTextColor(...C.gray600); doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
  doc.text('Ratio de Liquidez Corriente', M + 6, y + 6);
  doc.text('(Activo Corriente / Pasivo Corriente)', M + 6, y + 11);
  doc.setTextColor(...C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(20);
  doc.text(liq !== null ? `${fmtNumber(liq, 2)}x` : '–', M + 6, y + 19);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...liqColor);
  doc.text(`Estado: ${statusLabel(liqColor)}`, PW - M - 30, y + 12);
}

// ── GRÁFICOS ──────────────────────────────────────────────────────────────────

function drawChartsPage(doc, chartRefs, month, year, logoPng) {
  pageHeader(doc, `Gráficos y Tendencias · ${month} ${year}`, logoPng);
  let y = 24;
  y = sectionTitle(doc, '3. Gráficos y Tendencias', y);

  const charts = [
    { ref: chartRefs?.trends,      label: 'Evolución Mensual: Facturación vs Cobranza' },
    { ref: chartRefs?.composition, label: 'Composición de Facturación por Canal' },
    { ref: chartRefs?.solvency,    label: 'Solvencia: Activo y Pasivo' },
  ];

  for (const { ref, label } of charts) {
    if (!ref) continue;
    try {
      const imgData = ref.toDataURL('image/png');
      const ratio   = ref.height / ref.width;
      const imgH    = Math.min(CW * ratio, 65);

      doc.setTextColor(...C.gray500); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
      doc.text(label, M, y + 4);
      y += 7;
      doc.addImage(imgData, 'PNG', M, y, CW, imgH);
      y += imgH + 10;

      if (y > PH - 50) {
        doc.addPage();
        pageHeader(doc, `Gráficos · ${month} ${year}`, logoPng);
        y = 24;
      }
    } catch { /* chart unavailable */ }
  }
}

// ── MATRIZ COMPLETA ───────────────────────────────────────────────────────────

function drawMatrixPages(doc, autoTable, data, config, month, year, logoPng) {
  pageHeader(doc, `Matriz de Indicadores · ${month} ${year}`, logoPng);

  const meses = data.months.map(m => m.slice(0, 3));

  const sections = [
    { title:'Facturación', rows:[
      ['Facturación Real',    data.facturacion.real,        'currency'],
      ['Variación m/m',       data.facturacion.variacion,   'percent' ],
      ['Objetivo',            data.facturacion.objetivo,    'currency'],
      ['Cumplimiento',        data.facturacion.cumplimiento,'percent' ],
    ]},
    { title:'Cobranza', rows:[
      ['Cobranza Total',      data.cobranza.real,           'currency'],
      ['Variación mensual',   data.cobranza.variacion,      'percent' ],
      ['Objetivo',            data.cobranza.objetivo,       'currency'],
      ['Cumplimiento',        data.cobranza.cumplimiento,   'percent' ],
    ]},
    { title:'Activo Corriente', rows:[
      ['Total Activo Cte',    data.activoCorriente.total,      'currency'],
      ['Caja y Bancos',       data.activoCorriente.cajaBancos, 'currency'],
      ['Cheques en cartera',  data.activoCorriente.cheques,    'currency'],
      ['Deudores por ventas', data.activoCorriente.deudores,   'currency'],
      ['Plazo Fijo',          data.activoCorriente.plazoFijo,  'currency'],
    ]},
    { title:'Pasivos', rows:[
      ['Pasivo Corriente',    data.pasivoCorriente.total,    'currency'],
      ['Pasivo No Corriente', data.pasivoNoCorriente.total,  'currency'],
    ]},
  ];

  const customRows = (config?.customVariables ?? [])
    .filter(cv => cv.enabled && cv.showInMatrix)
    .map(cv => [cv.displayName, data.custom?.[cv.id] ?? Array(12).fill(null), cv.dataType]);

  if (customRows.length > 0) sections.push({ title:'Indicadores personalizados', rows: customRows });

  const head = [['Indicador', ...meses]];
  const allBody = [];

  for (const { title, rows } of sections) {
    allBody.push([{
      content: title, colSpan: 13,
      styles: { fillColor: C.navy, textColor: C.white, fontStyle:'bold', fontSize:7.5 },
    }]);
    for (const [label, arr, type] of rows) {
      allBody.push([
        label,
        ...Array(12).fill(0).map((_,i) => {
          const v = Array.isArray(arr) ? arr[i] : null;
          return (v !== null && v !== undefined) ? fmt(v, type) : '';
        }),
      ]);
    }
  }

  autoTable(doc, {
    startY: 28,
    head,
    body: allBody,
    theme: 'grid',
    headStyles: { fillColor: C.gray200, textColor: C.navy, fontSize: 6, fontStyle:'bold', halign:'center' },
    bodyStyles: { fontSize: 6, textColor: C.navy, halign:'right' },
    columnStyles: { 0:{ halign:'left', cellWidth:36, fontStyle:'bold' } },
    alternateRowStyles: { fillColor: C.gray50 },
    margin: { left:M, right:M, top:22 },
    // logoPng captured via closure — safe because didDrawPage is synchronous
    didDrawPage: () => { pageHeader(doc, `Matriz de Indicadores · ${month} ${year}`, logoPng); },
  });
}

// ── ODOO: P&L ─────────────────────────────────────────────────────────────────

const INCOME_TYPES_PDF = ['income', 'income_other'];
const COGS_TYPES_PDF   = ['expense_direct_cost'];
const OPEX_TYPES_PDF   = ['expense', 'expense_depreciation'];

function addPnlPage(pdf, pnlData) {
  if (!pnlData?.resumen) return;
  pdf.addPage();
  const margin = 20;
  const pageW  = pdf.internal.pageSize.getWidth();
  const { resumen, cuentas = [], mensual = [] } = pnlData;

  pdf.setFontSize(16); pdf.setTextColor(30, 30, 60);
  pdf.text('Estado de Resultados · Odoo', margin, 28);
  pdf.setFontSize(10); pdf.setTextColor(120, 120, 140);
  pdf.text(`${pnlData.year} · Año en curso · ${mensual.length} meses`, margin, 40);
  pdf.setDrawColor(200, 200, 220);
  pdf.line(margin, 44, pageW - margin, 44);

  const kpis = [
    { label: 'INGRESOS YTD',    value: fmtCurrency(resumen.ingresos) },
    { label: 'RESULTADO BRUTO', value: fmtCurrency(resumen.resultadoBruto), sub: `Margen ${resumen.margenBruto.toFixed(1)}%` },
    { label: 'RESULTADO NETO',  value: fmtCurrency(resumen.resultadoNeto),  sub: `Margen ${resumen.margenNeto.toFixed(1)}%` },
  ];
  const boxW = (pageW - margin * 2 - 10) / 3;
  kpis.forEach((kpi, i) => {
    const bx = margin + i * (boxW + 5);
    pdf.setFillColor(245, 245, 252); pdf.roundedRect(bx, 50, boxW, 32, 3, 3, 'F');
    pdf.setFontSize(7); pdf.setTextColor(130, 130, 160);
    pdf.text(kpi.label, bx + 6, 59);
    pdf.setFontSize(10); pdf.setTextColor(30, 30, 60);
    pdf.text(kpi.value, bx + 6, 69);
    if (kpi.sub) { pdf.setFontSize(8); pdf.setTextColor(150, 150, 180); pdf.text(kpi.sub, bx + 6, 77); }
  });

  pdf.autoTable({
    startY: 92, margin: { left: margin, right: margin },
    head: [['Concepto', 'Monto ARS']],
    body: [
      ['Ingresos',              fmtCurrency(resumen.ingresos)],
      ['(-) Costo de ventas',   '- ' + fmtCurrency(resumen.costoVentas)],
      ['Resultado bruto',       fmtCurrency(resumen.resultadoBruto)],
      ['(-) Gastos operativos', '- ' + fmtCurrency(resumen.gastosOperativos)],
      ...(resumen.depreciaciones > 0
        ? [['(-) Depreciaciones', '- ' + fmtCurrency(resumen.depreciaciones)]]
        : []),
      ['Resultado neto',        fmtCurrency(resumen.resultadoNeto)],
    ],
    headStyles: { fillColor: [30, 30, 60], textColor: 255, fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: ({ row, column, cell }) => {
      const label = row.raw?.[0] ?? '';
      const isTotal = ['Resultado bruto', 'Resultado neto'].includes(label);
      if (isTotal) { cell.styles.fontStyle = 'bold'; cell.styles.fillColor = [235, 235, 248]; }
      if (column.index === 1) {
        if (String(row.raw?.[1] ?? '').startsWith('-'))
          cell.styles.textColor = [180, 50, 50];
        if (isTotal)
          cell.styles.textColor = parseFloat(String(row.raw?.[1]).replace(/[^0-9.-]/g, '')) >= 0
            ? [30, 140, 100] : [180, 50, 50];
      }
    },
  });

  if (cuentas.length > 0) {
    const y2 = pdf.lastAutoTable.finalY + 14;
    pdf.setFontSize(11); pdf.setTextColor(50, 50, 80);
    pdf.text('Detalle por cuenta', margin, y2);

    const rows = [
      ...cuentas.filter(c => INCOME_TYPES_PDF.includes(c.tipo))
        .map(c => [c.codigo, c.nombre, 'Ingreso', fmtCurrency(c.monto)]),
      ...cuentas.filter(c => COGS_TYPES_PDF.includes(c.tipo))
        .map(c => [c.codigo, c.nombre, 'Costo ventas', fmtCurrency(c.monto)]),
      ...cuentas.filter(c => OPEX_TYPES_PDF.includes(c.tipo))
        .map(c => [c.codigo, c.nombre, 'Gasto operativo', fmtCurrency(c.monto)]),
    ];

    pdf.autoTable({
      startY: y2 + 5, margin: { left: margin, right: margin },
      head: [['Código', 'Cuenta', 'Tipo', 'Monto ARS']],
      body: rows,
      headStyles: { fillColor: [60, 60, 90], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 35 }, 3: { cellWidth: 52, halign: 'right' } },
    });
  }
}

// ── ODOO: ANÁLISIS COMERCIAL ──────────────────────────────────────────────────

function addOdooComercialPage(pdf, odooData) {
  if (!odooData) return;
  pdf.addPage();
  const margin = 20;
  const pageW  = pdf.internal.pageSize.getWidth();

  pdf.setFontSize(16); pdf.setTextColor(30, 30, 60);
  pdf.text('Análisis Comercial · Odoo', margin, 28);
  pdf.setFontSize(10); pdf.setTextColor(120, 120, 140);
  pdf.text(`Facturación ${odooData.year} · Deudores históricos`, margin, 40);
  pdf.setDrawColor(200, 200, 220);
  pdf.line(margin, 44, pageW - margin, 44);

  let y = 52;

  if (odooData.topDeudores?.length > 0) {
    pdf.setFontSize(11); pdf.setTextColor(50, 50, 80);
    pdf.text('Top 20 Deudores', margin, y);
    pdf.setFontSize(9); pdf.setTextColor(130, 130, 160);
    pdf.text('Total pendiente: ' + fmtCurrency(odooData.totalDeuda), margin, y + 7);

    pdf.autoTable({
      startY: y + 13, margin: { left: margin, right: margin },
      head: [['#', 'Cliente', 'Deuda pendiente ARS']],
      body: odooData.topDeudores.map((d, i) => [i + 1, d.nombre, fmtCurrency(d.deuda)]),
      headStyles: { fillColor: [30, 30, 60], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 2: { cellWidth: 58, halign: 'right' } },
      didParseCell: ({ row, column, cell }) => {
        if (column.index === 2 && row.section === 'body') {
          if (row.index < 3)      cell.styles.textColor = [180, 50, 50];
          else if (row.index < 8) cell.styles.textColor = [170, 110, 30];
        }
      },
    });
    y = pdf.lastAutoTable.finalY + 16;
  }

  if (odooData.facturacionPorProvincia?.length > 0) {
    if (y > 200) { pdf.addPage(); y = 30; }
    pdf.setFontSize(11); pdf.setTextColor(50, 50, 80);
    pdf.text(`Facturación ${odooData.year} por Provincia`, margin, y);
    pdf.setFontSize(9); pdf.setTextColor(130, 130, 160);
    pdf.text(
      `Total: ${fmtCurrency(odooData.totalFacturado)} · ${odooData.cantidadFacturas} facturas`,
      margin, y + 7
    );

    pdf.autoTable({
      startY: y + 13, margin: { left: margin, right: margin },
      head: [['#', 'Provincia', 'Facturación ARS', 'Facturas']],
      body: odooData.facturacionPorProvincia.map((p, i) => [
        i + 1, p.provincia, fmtCurrency(p.total), p.cantidad,
      ]),
      headStyles: { fillColor: [30, 30, 60], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 58, halign: 'right' },
        3: { cellWidth: 24, halign: 'center' },
      },
    });
  }
}

// ── FUNCIÓN PRINCIPAL (EXPORTADA) ─────────────────────────────────────────────

export async function generateMonthlyReport({ companyData, config, selectedMonthIdx, chartRefs, odooData = {}, mode = 'save' }) {
  // Imports dinámicos para compatibilidad con SSR de Next.js
  const { default: jsPDF }     = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  // Pre-compute logo PNG once; all draw functions reuse it synchronously
  const logoPng = await loadLogoPng();

  const doc   = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const month = companyData.months[selectedMonthIdx];
  const year  = new Date().getFullYear();
  const today = fmtDateLong(new Date());

  const sections = config?.pdfExport?.sections ?? PDF_SECTIONS_DEFAULT;

  // 1 — Portada (siempre)
  drawCover(doc, month, year, today, logoPng);

  // 2 — Indicadores clave + diagnóstico
  if (sections.includes('kpis')) {
    doc.addPage();
    drawKPIPage(doc, autoTable, companyData, config, selectedMonthIdx, month, year, logoPng);
  }

  // 3 — Balance patrimonial
  if (sections.includes('balance')) {
    doc.addPage();
    drawBalancePage(doc, autoTable, companyData, config, selectedMonthIdx, month, year, logoPng);
  }

  // 4 — Gráficos (solo si hay canvas disponibles y la sección está activa)
  if (sections.includes('graficos')) {
    const hasCharts = chartRefs && Object.values(chartRefs).some(Boolean);
    if (hasCharts) {
      doc.addPage();
      drawChartsPage(doc, chartRefs, month, year, logoPng);
    }
  }

  // 5 — Matriz completa
  if (sections.includes('matriz')) {
    doc.addPage();
    drawMatrixPages(doc, autoTable, companyData, config, month, year, logoPng);
  }

  // Footers en todas las páginas excepto la portada
  const total = doc.internal.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    pageFooter(doc, p - 1, total - 1, month, year);
  }

  const { pnlData, comercialData } = odooData;

  try {
    if (odooData?.pnlData && sections.includes('pnl'))
      addPnlPage(doc, odooData.pnlData);
    if (odooData?.comercialData && sections.includes('odoo_comercial'))
      addOdooComercialPage(doc, odooData.comercialData);
  } catch (e) {
    console.warn('[PDF] Páginas Odoo omitidas:', e.message);
  }

  if (mode === 'save' || mode === undefined) {
    const nombreMes = String(selectedMonthIdx + 1).padStart(2, '0');
    doc.save(`reporte-wara-gps-${nombreMes}.pdf`);
    return;
  }
  if (mode === 'base64') {
    try {
      const dataUri = doc.output('datauristring');
      // Extraer solo la parte base64 (sin el prefijo data:...;base64,)
      return dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
    } catch (e) {
      console.error('[generatePDF base64]', e);
      return null;
    }
  }
  if (mode === 'blob') {
    return doc.output('blob');
  }
}
