// lib/generatePDF.js
// Reporte financiero mensual — Wara GPS / Blo S.A.

// ── Constantes ────────────────────────────────────────────────────────────────
const PW = 210, PH = 297, M = 14, CW = 182;

const C = {
  navy:   [15, 23, 42],   indigo: [79, 70, 229],
  white:  [255,255,255],  gray50: [248,250,252],
  gray100:[241,245,249],  gray200:[226,232,240],
  gray400:[148,163,184],  gray500:[100,116,139],
  gray600:[71, 85, 105],  green:  [5,  150,105],
  amber:  [217,119,6],    red:    [225,29, 72],
  indigo2:[49, 46, 129],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(val, type) {
  if (val === null || val === undefined) return '–';
  if (typeof val === 'string') return val;
  if (type === 'currency')
    return new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(val);
  if (type === 'percent') return `${Number(val).toFixed(2)}%`;
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits:2 }).format(val);
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

function pageHeader(doc, sub) {
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, PW, 16, 'F');
  doc.setTextColor(...C.white); doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text('WARA GPS', M, 10);
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
  doc.text(sub, PW - M, 10, { align:'right' });
}

function pageFooter(doc, n, total, month, year) {
  doc.setFillColor(...C.gray100);
  doc.rect(0, PH - 10, PW, 10, 'F');
  doc.setTextColor(...C.gray500); doc.setFont('helvetica','normal'); doc.setFontSize(7);
  doc.text('Blo, Bienestar, Logística y Organización S.A.', M, PH - 4);
  doc.text(`Reporte ${month} ${year} · Confidencial`, PW/2, PH - 4, { align:'center' });
  doc.text(`Pág. ${n} de ${total}`, PW - M, PH - 4, { align:'right' });
}

function sectionTitle(doc, text, y) {
  doc.setFillColor(...C.indigo); doc.rect(M, y, 3, 6, 'F');
  doc.setTextColor(...C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text(text, M + 5, y + 5);
  return y + 12;
}

function kpiCard(doc, x, y, w, h, { title, value, objetivo, cumplimiento, statusColor }) {
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
      ? `${cumplimiento.toFixed(2)}% cumplimiento`
      : String(cumplimiento);
    doc.text(label, x + 6, y + 27);
  }
}

// ── PORTADA ───────────────────────────────────────────────────────────────────

function drawCover(doc, month, year, today) {
  doc.setFillColor(...C.navy); doc.rect(0, 0, PW, PH / 2, 'F');
  // Empresa
  doc.setTextColor(...C.white); doc.setFont('helvetica','bold'); doc.setFontSize(26);
  doc.text('WARA GPS', M, 55);
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(...C.gray400);
  doc.text('Business Intelligence & Finance', M, 65);
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

function drawKPIPage(doc, autoTable, data, config, mIdx, month, year) {
  pageHeader(doc, `Indicadores Clave · ${month} ${year}`);
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
    value: varFact !== null ? `${Number(varFact).toFixed(2)}%` : '–',
    objetivo: null, cumplimiento: null,
    statusColor: semColor('variacion', varFact, config),
  });
  kpiCard(doc, M + W + 6, y, W, H, {
    title: config?.labels?.liquidez ?? 'Ratio Liquidez',
    value: liq !== null ? `${liq.toFixed(2)}x` : '–',
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
      detail: `${fmt(real,'currency')} vs objetivo ${fmt(objFact,'currency')} · ${cumplF !== null ? Number(cumplF).toFixed(2)+'%' : '–'} cumplimiento` },
    { label: config?.labels?.cobranza ?? 'Cobranza', val: realCob, cumpl: cumplC, type: 'cumplimiento',
      detail: `${fmt(realCob,'currency')} vs objetivo ${fmt(objCob,'currency')} · ${cumplC !== null ? Number(cumplC).toFixed(2)+'%' : '–'} cumplimiento` },
    { label: config?.labels?.variacion ?? 'Variación M/M', val: varFact, cumpl: varFact, type: 'variacion',
      detail: varFact !== null ? `${Number(varFact).toFixed(2)}% vs mes anterior` : 'Sin datos' },
    { label: config?.labels?.liquidez ?? 'Ratio Liquidez', val: liq, cumpl: liq, type: 'liquidez',
      detail: liq !== null ? `${liq.toFixed(2)}x (Activo Cte / Pasivo Cte)` : 'Sin datos' },
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

function drawBalancePage(doc, autoTable, data, config, mIdx, month, year) {
  pageHeader(doc, `Posición Patrimonial · ${month} ${year}`);
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
  doc.text(liq !== null ? `${liq.toFixed(2)}x` : '–', M + 6, y + 19);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...liqColor);
  doc.text(`Estado: ${statusLabel(liqColor)}`, PW - M - 30, y + 12);
}

// ── GRÁFICOS ──────────────────────────────────────────────────────────────────

function drawChartsPage(doc, chartRefs, month, year) {
  pageHeader(doc, `Gráficos y Tendencias · ${month} ${year}`);
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
        pageHeader(doc, `Gráficos · ${month} ${year}`);
        y = 24;
      }
    } catch { /* chart unavailable */ }
  }
}

// ── MATRIZ COMPLETA ───────────────────────────────────────────────────────────

function drawMatrixPages(doc, autoTable, data, config, month, year) {
  pageHeader(doc, `Matriz de Indicadores · ${month} ${year}`);

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
    didDrawPage: () => { pageHeader(doc, `Matriz de Indicadores · ${month} ${year}`); },
  });
}

// ── FUNCIÓN PRINCIPAL (EXPORTADA) ─────────────────────────────────────────────

export async function generateMonthlyReport({ companyData, config, selectedMonthIdx, chartRefs }) {
  // Imports dinámicos para compatibilidad con SSR de Next.js
  const { default: jsPDF }     = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc   = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const month = companyData.months[selectedMonthIdx];
  const year  = new Date().getFullYear();
  const today = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' });

  // 1 — Portada
  drawCover(doc, month, year, today);

  // 2 — Indicadores clave + diagnóstico
  doc.addPage();
  drawKPIPage(doc, autoTable, companyData, config, selectedMonthIdx, month, year);

  // 3 — Balance patrimonial
  doc.addPage();
  drawBalancePage(doc, autoTable, companyData, config, selectedMonthIdx, month, year);

  // 4 — Gráficos (solo si hay canvas disponibles)
  const hasCharts = chartRefs && Object.values(chartRefs).some(Boolean);
  if (hasCharts) {
    doc.addPage();
    drawChartsPage(doc, chartRefs, month, year);
  }

  // 5 — Matriz completa
  doc.addPage();
  drawMatrixPages(doc, autoTable, companyData, config, month, year);

  // Footers en todas las páginas excepto la portada
  const total = doc.internal.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    pageFooter(doc, p - 1, total - 1, month, year);
  }

  doc.save(`Wara_GPS_${month}_${year}.pdf`);
}
