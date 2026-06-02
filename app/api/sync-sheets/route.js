import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { setDashboardData } from '@/lib/kv';

export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  if (!adminEmails.includes(session.user.email)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  const sheetId  = process.env.GOOGLE_SHEET_ID;
  const email    = process.env.GOOGLE_CLIENT_EMAIL;
  const key      = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!sheetId || !email || !key) {
    return NextResponse.json(
      { error: 'Variables GOOGLE_SHEET_ID, GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY no configuradas' },
      { status: 500 }
    );
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: email, private_key: key },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheetsApi = google.sheets({ version: 'v4', auth });

    // Leer la primera hoja con valores sin formatear (números como números, no strings)
    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: '2026',                   // nombre de la hoja — ajustar si es diferente
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'La hoja está vacía o no tiene datos' }, { status: 422 });
    }

    const data = parseSheetRows(rows);
    await setDashboardData(data);

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[sync-sheets] Error:', err.message);
    const msg = err.code === 403
      ? 'Sin acceso al Sheet. Verificá que la service account tiene acceso de Viewer.'
      : err.code === 404
      ? 'Sheet no encontrado. Verificá GOOGLE_SHEET_ID.'
      : 'Error al sincronizar con Google Sheets.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Parser de filas — misma lógica que parseAndExtractXLSX en ImportPanel.js
// pero recibe directamente el array de rows de la Sheets API
function parseSheetRows(rows) {
  const monthNames = ['enero','febrero','marzo','abril','mayo','junio',
                      'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const monthMap = {};
  (rows[0] || []).forEach((h, idx) => {
    const m = monthNames.indexOf(String(h ?? '').toLowerCase().trim());
    if (m !== -1) monthMap[m] = idx;
  });

  if (Object.keys(monthMap).length === 0)
    throw new Error('No se encontraron columnas de meses en la primera fila');

  const empty = () => Array(12).fill(null);
  const data = {
    months: ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
             'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    facturacion:       { real: empty(), variacion: empty(), objetivo: empty(), cumplimiento: empty() },
    cobranza:          { real: empty(), variacion: empty(), objetivo: empty(), cumplimiento: empty() },
    activoCorriente:   { total: empty(), cajaBancos: empty(), fci: empty(), cheques: empty(),
                         deudores: empty(), top20Deudores: empty(), plazoFijo: empty() },
    activoNoCorriente: { total: empty(), participacionOrbitrix: empty() },
    pasivoCorriente:   { total: empty(), proveedores: empty(),
                         facturasPendientes: empty(), pagosComprometidos: empty() },
    pasivoNoCorriente: { total: empty(), planesArca: empty(), prestamos: empty() },
    facturacionMix:    { ratioAbonos: empty(), ratioInstalaciones: empty(), ratioOtros: empty() },
  };

  function parseVal(val, isPercent) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') {
      return isNaN(val) ? null : (isPercent ? parseFloat((val * 100).toFixed(4)) : val);
    }
    const s = String(val).trim();
    if (!s || ['sin datos','sin dato','-'].includes(s.toLowerCase())) return null;
    const errores = ['#value!','#div/0!','#n/a','#ref!','#name?','#null!'];
    if (errores.includes(s.toLowerCase())) return s.toUpperCase();
    let clean = s.replace(/\$/g,'').replace(/\s/g,'').trim();
    const hasPct = clean.includes('%');
    clean = clean.replace(/%/g,'');
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.lastIndexOf(',') > clean.lastIndexOf('.')
        ? clean.replace(/\./g,'').replace(',','.') : clean.replace(/,/g,'');
    } else if (clean.includes(',') && !clean.includes('.')) {
      clean = (clean.match(/,/g)||[]).length > 1
        ? clean.replace(/,/g,'') : clean.replace(',','.');
    } else if (clean.includes('.') && !clean.includes(',')) {
      const parts = clean.split('.');
      if (parts.length > 2 && parts.slice(1).every(p => p.length === 3))
        clean = clean.replace(/\./g,'');
    }
    const num = parseFloat(clean);
    if (isNaN(num)) return null;
    return (isPercent && !hasPct) ? parseFloat((num * 100).toFixed(4)) : num;
  }

  function setVal(path, mIdx, val) {
    if (val === null || val === undefined) return;
    const keys = path.split('.');
    let ref = data;
    for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
    ref[keys[keys.length - 1]][mIdx] = val;
  }

  const sinAcentos = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  const ignorar = ['facturación por tipo de productos','facturación desagregada'];

  const sectionAnchors = {
    'facturación total (iva incluído)': 'facturacion',
    'facturación total': 'facturacion',
    'facturación':       'facturacion',
    'cobranza total':    'cobranza',
    'activo corriente':    'activos',
    'activo no corriente': 'activos',
    'pasivo corriente':    'pasivos',
    'pasivo no corriente': 'pasivos',
  };

  const global = {
    'facturación total (iva incluído)':      { key: 'facturacion.real',         ip: false },
    'facturación total':                     { key: 'facturacion.real',         ip: false },
    'objetivo de ventas':                    { key: 'facturacion.objetivo',     ip: false },
    'cumplimiento de objetivo de ventas':    { key: 'facturacion.cumplimiento', ip: true  },
    'cobranza total':                        { key: 'cobranza.real',            ip: false },
    'variación mensual':                     { key: 'cobranza.variacion',       ip: true  },
    'objetivo del mes':                      { key: 'cobranza.objetivo',        ip: false },
    'cumplimiento de objetivo de cobranzas': { key: 'cobranza.cumplimiento',    ip: true  },
    'activo corriente':           { key: 'activoCorriente.total',         ip: false },
    'caja y bancos':              { key: 'activoCorriente.cajaBancos',    ip: false },
    'fci':                        { key: 'activoCorriente.fci',           ip: false },
    'cheques en cartera':         { key: 'activoCorriente.cheques',       ip: false },
    'deudores por ventas':        { key: 'activoCorriente.deudores',      ip: false },
    'top 20 deudores por ventas': { key: 'activoCorriente.top20Deudores', ip: false },
    'top 20 deudores':            { key: 'activoCorriente.top20Deudores', ip: false },
    'plazo fijos':                { key: 'activoCorriente.plazoFijo',     ip: false },
    'plazo fijo':                 { key: 'activoCorriente.plazoFijo',     ip: false },
    'activo no corriente':           { key: 'activoNoCorriente.total',                 ip: false },
    'participación en orbitrix arg': { key: 'activoNoCorriente.participacionOrbitrix', ip: false },
    'participación en orbitrix':     { key: 'activoNoCorriente.participacionOrbitrix', ip: false },
    'pasivo corriente':           { key: 'pasivoCorriente.total',              ip: false },
    'cheques pendientes de pago': { key: 'pasivoCorriente.proveedores',        ip: false },
    'facturas pendientes':        { key: 'pasivoCorriente.facturasPendientes', ip: false },
    'pagos comprometidos':        { key: 'pasivoCorriente.pagosComprometidos', ip: false },
    'pasivo no corriente':  { key: 'pasivoNoCorriente.total',      ip: false },
    'planes de pago arca':  { key: 'pasivoNoCorriente.planesArca', ip: false },
    'planes arca':          { key: 'pasivoNoCorriente.planesArca', ip: false },
    'préstamos':            { key: 'pasivoNoCorriente.prestamos',  ip: false },
    'prestamos':            { key: 'pasivoNoCorriente.prestamos',  ip: false },
    'ratio abonos':          { key: 'facturacionMix.ratioAbonos',        ip: true },
    'ratio otros conceptos': { key: 'facturacionMix.ratioOtros',         ip: true },
    'ratio instalaciones':   { key: 'facturacionMix.ratioInstalaciones', ip: true },
  };

  const porSeccion = {
    'variación m/m': {
      facturacion: { key: 'facturacion.variacion', ip: true },
      cobranza:    { key: 'cobranza.variacion',    ip: true },
    },
  };

  let seccion = null;

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    if (!cells || !cells[0]) continue;

    const label   = String(cells[0]).trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
    const labelSA = sinAcentos(label);

    if (ignorar.some(ig => label.includes(ig))) continue;

    for (const [anchor, sec] of Object.entries(sectionAnchors)) {
      if (label === anchor || label.startsWith(anchor)) { seccion = sec; break; }
    }

    let mapping = null, bestLen = 0;
    for (const [key, val] of Object.entries(global)) {
      const keySA = sinAcentos(key);
      if ((label.includes(key) || labelSA.includes(keySA)) && key.length > bestLen) {
        mapping = val; bestLen = key.length;
      }
    }

    if (!mapping) {
      for (const [key, secMap] of Object.entries(porSeccion)) {
        if (label === key || label.includes(key)) {
          if (seccion && secMap[seccion]) mapping = secMap[seccion];
          break;
        }
      }
    }

    if (mapping) {
      for (const [mIdxStr, colIdx] of Object.entries(monthMap)) {
        const rawVal = cells[colIdx] ?? null;
        const v = parseVal(rawVal, mapping.ip);
        if (v !== null) setVal(mapping.key, parseInt(mIdxStr), v);
      }
    }
  }

  return data;
}
