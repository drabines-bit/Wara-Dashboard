"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";

// ── Data structure ──────────────────────────────────────────────────────────
function buildEmptyData() {
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

function setNestedValue(obj, keyPath, index, value) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]][index] = value;
}

function parseAndExtractXLSX(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });

  if (rows.length < 2) throw new Error('Archivo sin datos suficientes');

  // Detectar columnas de meses
  const monthNames = ['enero','febrero','marzo','abril','mayo','junio',
                      'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const monthMap = {};
  (rows[0] || []).forEach((h, idx) => {
    const m = monthNames.indexOf(String(h || '').toLowerCase().trim());
    if (m !== -1) monthMap[m] = idx;
  });

  if (Object.keys(monthMap).length === 0)
    throw new Error('No se encontraron columnas de meses en la primera fila');

  // Estructura vacía
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

  // Parser de valores numéricos con formato argentino
  function parseVal(val, isPercent) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') {
      return isNaN(val) ? null : (isPercent ? parseFloat((val * 100).toFixed(4)) : val);
    }
    const s = String(val).trim();
    if (!s || ['sin datos', 'sin dato', '-'].includes(s.toLowerCase())) return null;
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

  // Escribir valor en la estructura de datos
  function setVal(path, mIdx, val) {
    if (val === null || val === undefined) return;
    const keys = path.split('.');
    let ref = data;
    for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
    ref[keys[keys.length - 1]][mIdx] = val;
  }

  // Filas a ignorar (contienen estas cadenas)
  const ignorar = [
    'facturación por tipo de productos',
    'facturación desagregada',
    'variación m/m resultado',
  ];

  // Anclajes de sección — detectan en qué bloque estamos
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

  // Mapeos únicos (no dependen de la sección)
  const global = {
    // Facturación
    'facturación total (iva incluído)':      { key: 'facturacion.real',         ip: false },
    'facturación total':                     { key: 'facturacion.real',         ip: false },
    'objetivo de ventas':                    { key: 'facturacion.objetivo',     ip: false },
    'cumplimiento de objetivo de ventas':    { key: 'facturacion.cumplimiento', ip: true  },

    // Cobranza
    'cobranza total':                        { key: 'cobranza.real',            ip: false },
    'variación mensual':                     { key: 'cobranza.variacion',       ip: true  },
    'objetivo del mes':                      { key: 'cobranza.objetivo',        ip: false },
    'cumplimiento de objetivo de cobranzas': { key: 'cobranza.cumplimiento',    ip: true  },

    // Activo Corriente
    'activo corriente':           { key: 'activoCorriente.total',         ip: false },
    'caja y bancos':              { key: 'activoCorriente.cajaBancos',    ip: false },
    'fci':                        { key: 'activoCorriente.fci',           ip: false },
    'cheques en cartera':         { key: 'activoCorriente.cheques',       ip: false },
    'deudores por ventas':        { key: 'activoCorriente.deudores',      ip: false },
    'top 20 deudores por ventas': { key: 'activoCorriente.top20Deudores', ip: false },
    'top 20 deudores':            { key: 'activoCorriente.top20Deudores', ip: false },
    'plazo fijos':                { key: 'activoCorriente.plazoFijo',     ip: false },
    'plazo fijo':                 { key: 'activoCorriente.plazoFijo',     ip: false },

    // Activo No Corriente
    'activo no corriente':           { key: 'activoNoCorriente.total',                 ip: false },
    'participación en orbitrix arg': { key: 'activoNoCorriente.participacionOrbitrix', ip: false },
    'participación en orbitrix':     { key: 'activoNoCorriente.participacionOrbitrix', ip: false },

    // Pasivo Corriente
    'pasivo corriente':           { key: 'pasivoCorriente.total',              ip: false },
    'cheques pendientes de pago': { key: 'pasivoCorriente.proveedores',        ip: false },
    'facturas pendientes':        { key: 'pasivoCorriente.facturasPendientes', ip: false },
    'pagos comprometidos':        { key: 'pasivoCorriente.pagosComprometidos', ip: false },

    // Pasivo No Corriente
    'pasivo no corriente':  { key: 'pasivoNoCorriente.total',      ip: false },
    'planes de pago arca':  { key: 'pasivoNoCorriente.planesArca', ip: false },
    'planes arca':          { key: 'pasivoNoCorriente.planesArca', ip: false },
    'préstamos':            { key: 'pasivoNoCorriente.prestamos',  ip: false },
    'prestamos':            { key: 'pasivoNoCorriente.prestamos',  ip: false },

    // Composición de facturación
    'ratio abonos':        { key: 'facturacionMix.ratioAbonos',        ip: true },
    'ratio otros':         { key: 'facturacionMix.ratioOtros',         ip: true },
    'ratio instalaciones': { key: 'facturacionMix.ratioInstalaciones', ip: true },
  };

  // Mapeos dependientes de sección (mismo label en distintos bloques)
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

    const label = String(cells[0]).trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');

    // Ignorar filas explícitas
    if (ignorar.some(ig => label.includes(ig))) continue;

    // Actualizar sección activa
    for (const [anchor, sec] of Object.entries(sectionAnchors)) {
      if (label === anchor || label.startsWith(anchor)) { seccion = sec; break; }
    }

    // Buscar mapeo global (match más largo gana)
    // sinAcentos garantiza que diferencias de normalización Unicode no rompan el match
    const sinAcentos = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const labelSA = sinAcentos(label);

    let mapping = null;
    let bestLen = 0;
    for (const [key, val] of Object.entries(global)) {
      const keySA = sinAcentos(key);
      if ((label.includes(key) || labelSA.includes(keySA)) && key.length > bestLen) {
        mapping = val; bestLen = key.length;
      }
    }

    // Si no hay global, buscar por sección
    if (!mapping) {
      for (const [key, secMap] of Object.entries(porSeccion)) {
        if (label === key || label.includes(key)) {
          if (seccion && secMap[seccion]) mapping = secMap[seccion];
          break;
        }
      }
    }

    // Aplicar mapeo
    if (mapping) {
      for (const [mIdxStr, colIdx] of Object.entries(monthMap)) {
        const v = parseVal(cells[colIdx], mapping.ip);
        if (v !== null) setVal(mapping.key, parseInt(mIdxStr), v);
      }
    }
  }

  return data;
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ImportPanel() {
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef();

  async function processFile(file) {
    if (!file) return;
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (![".xlsx", ".xls"].includes(ext)) {
      setStatus("error");
      setMessage("Formato no soportado. Usá un archivo .xlsx o .xls.");
      return;
    }

    setStatus("loading");
    setMessage("Procesando archivo...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = parseAndExtractXLSX(arrayBuffer);

      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar en la base de datos.");
      }

      setStatus("success");
      setMessage("Importación exitosa. Dashboard actualizado.");
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Error al procesar el archivo.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Zona drag & drop */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          processFile(e.dataTransfer.files[0]);
        }}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
          isDragging
            ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950"
            : "border-slate-300 dark:border-slate-600 hover:border-indigo-300"
        }`}
      >
        <div className="text-4xl mb-3">📊</div>
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          Arrastrá el archivo Excel aquí
        </p>
        <p className="text-slate-500 text-sm mt-1">o hacé clic para seleccionarlo</p>
        <p className="text-xs text-slate-400 mt-3">Formatos: .xlsx · .xls</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => processFile(e.target.files[0])}
        />
      </div>

      {/* Estado */}
      {status === "loading" && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-blue-700 dark:text-blue-300 text-sm flex items-center space-x-2">
            <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>{message}</span>
          </p>
        </div>
      )}
      {status === "success" && (
        <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">
            ✓ {message}
          </p>
          <a
            href="/dashboard"
            className="text-emerald-600 text-sm underline mt-1 inline-block"
          >
            Ver dashboard actualizado →
          </a>
        </div>
      )}
      {status === "error" && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-300 text-sm">✗ {message}</p>
        </div>
      )}

      {/* Guía de formato */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-3">
          Estructura esperada del Excel
        </p>
        <ul className="space-y-1.5 text-sm text-slate-500">
          <li>• La <strong>fila 1</strong> debe contener los meses: Enero, Febrero, Marzo…</li>
          <li>• La <strong>columna A</strong> debe contener los nombres de indicadores</li>
          <li>• Indicadores soportados: Facturación, Variación m/m, Objetivo, Cumplimiento, Cobranza Total, Activo Corriente, Caja y Bancos, Pasivo Corriente, Pasivo No Corriente, Ratio Abonos, Ratio Instalaciones, Ratio Otros, y más</li>
          <li>• Los valores pueden tener formato moneda ($) o porcentaje (%) — se parsean automáticamente</li>
        </ul>
      </div>
    </div>
  );
}
