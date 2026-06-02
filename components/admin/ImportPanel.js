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

// Portado 1:1 de handleXLSXUpload del dashboard original.
// Diferencias: no muta global companyData — construye y retorna un objeto nuevo.
function parseAndExtractXLSX(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  if (rows.length < 2) throw new Error("El archivo está vacío o no tiene datos legibles.");

  const data = buildEmptyData();
  const monthNamesLower = data.months.map((m) => m.toLowerCase());

  // Detectar columnas de meses en la fila de encabezado
  const monthMap = {};
  rows[0].forEach((h, idx) => {
    const clean = String(h || "").toLowerCase().trim();
    const mIdx = monthNamesLower.indexOf(clean);
    if (mIdx !== -1) monthMap[mIdx] = idx;
  });

  if (Object.keys(monthMap).length === 0) {
    throw new Error(
      'No se encontraron columnas de meses. Verificá que la primera fila contenga encabezados como "Enero", "Febrero", "Marzo", etc.'
    );
  }

  // parseNumber — portado exacto del HTML (v2, corregido)
  const parseNumber = (val, isPercent) => {
    if (val === null || val === undefined) return null;

    if (typeof val === "number") {
      if (isNaN(val)) return null;
      return isPercent ? parseFloat((val * 100).toFixed(4)) : val;
    }

    const strVal = String(val).trim();
    if (!strVal) return null;

    const excelErrors = ["#value!", "#div/0!", "#n/a", "#ref!", "#name?", "#null!"];
    if (excelErrors.includes(strVal.toLowerCase())) return strVal.toUpperCase();

    if (!/\d/.test(strVal)) return null;

    let clean = strVal.replace(/\$/g, "").replace(/\s/g, "").trim();
    const hasPercentSign = clean.includes("%");
    clean = clean.replace(/%/g, "");

    if (clean.includes(".") && clean.includes(",")) {
      const lastDot = clean.lastIndexOf(".");
      const lastComma = clean.lastIndexOf(",");
      if (lastComma > lastDot) {
        clean = clean.replace(/\./g, "").replace(",", ".");
      } else {
        clean = clean.replace(/,/g, "");
      }
    } else if (clean.includes(",") && !clean.includes(".")) {
      const commas = (clean.match(/,/g) || []).length;
      if (commas > 1) {
        clean = clean.replace(/,/g, "");
      } else {
        clean = clean.replace(",", ".");
      }
    } else if (clean.includes(".") && !clean.includes(",")) {
      const parts = clean.split(".");
      const allThreeDigits = parts.slice(1).every((p) => p.length === 3);
      if (parts.length > 2 && allThreeDigits) {
        clean = clean.replace(/\./g, "");
      } else if (parts.length === 2 && parts[1].length === 3 && parseInt(parts[0]) >= 10) {
        clean = clean.replace(".", "");
      }
    }

    const num = parseFloat(clean);
    if (isNaN(num)) return null;
    return isPercent && !hasPercentSign ? parseFloat((num * 100).toFixed(4)) : num;
  };

  const globalMappings = {
    // --- Filas a ignorar explícitamente (clave más larga gana) ---
    "facturación por tipo de productos": null,
    "facturación desagregada":           null,
    "variación m/m resultado":           null,

    // --- Facturación ---
    "facturación real": { key: "facturacion.real", isPercent: false },
    "facturación":      { key: "facturacion.real", isPercent: false },

    // --- Cobranza ---
    "cobranza total":   { key: "cobranza.real",      isPercent: false },
    "objetivo del mes": { key: "cobranza.objetivo",  isPercent: false },

    // --- Activo Corriente ---
    "activo corriente":           { key: "activoCorriente.total",         isPercent: false },
    "caja y bancos":              { key: "activoCorriente.cajaBancos",    isPercent: false },
    "fci":                        { key: "activoCorriente.fci",           isPercent: false },
    "cheques en cartera":         { key: "activoCorriente.cheques",       isPercent: false },
    "deudores por ventas":        { key: "activoCorriente.deudores",      isPercent: false },
    "top 20 deudores por ventas": { key: "activoCorriente.top20Deudores", isPercent: false },
    "top 20 deudores":            { key: "activoCorriente.top20Deudores", isPercent: false },
    "plazo fijos":                { key: "activoCorriente.plazoFijo",     isPercent: false },
    "plazo fijo":                 { key: "activoCorriente.plazoFijo",     isPercent: false },

    // --- Activo No Corriente ---
    "activo no corriente":           { key: "activoNoCorriente.total",                 isPercent: false },
    "participación en orbitrix arg": { key: "activoNoCorriente.participacionOrbitrix", isPercent: false },
    "participación en orbitrix":     { key: "activoNoCorriente.participacionOrbitrix", isPercent: false },

    // --- Pasivo Corriente ---
    "pasivo corriente":            { key: "pasivoCorriente.total",              isPercent: false },
    "cheques pendientes de pago":  { key: "pasivoCorriente.proveedores",        isPercent: false },
    "facturas pendientes de pago": { key: "pasivoCorriente.facturasPendientes", isPercent: false },
    "pagos comprometidos":         { key: "pasivoCorriente.pagosComprometidos", isPercent: false },

    // --- Pasivo No Corriente ---
    "pasivo no corriente": { key: "pasivoNoCorriente.total",      isPercent: false },
    "planes de pago arca": { key: "pasivoNoCorriente.planesArca", isPercent: false },
    "planes arca":         { key: "pasivoNoCorriente.planesArca", isPercent: false },
    "préstamos":           { key: "pasivoNoCorriente.prestamos",  isPercent: false },
    "prestamos":           { key: "pasivoNoCorriente.prestamos",  isPercent: false },

    // --- Composición de facturación ---
    "ratio abonos":        { key: "facturacionMix.ratioAbonos",       isPercent: true },
    "ratio otros":         { key: "facturacionMix.ratioOtros",         isPercent: true },
    "ratio instalaciones": { key: "facturacionMix.ratioInstalaciones", isPercent: true },
  };

  const sectionMappings = {
    "variación m/m": {
      facturacion: { key: "facturacion.variacion",    isPercent: true  },
      cobranza:    { key: "cobranza.variacion",       isPercent: true  },
    },
    "variacion m/m": {
      facturacion: { key: "facturacion.variacion",    isPercent: true  },
      cobranza:    { key: "cobranza.variacion",       isPercent: true  },
    },
    "objetivo": {
      facturacion: { key: "facturacion.objetivo",     isPercent: false },
      cobranza:    { key: "cobranza.objetivo",        isPercent: false },
    },
    "cumplimiento": {
      facturacion: { key: "facturacion.cumplimiento", isPercent: true  },
      cobranza:    { key: "cobranza.cumplimiento",    isPercent: true  },
    },
  };

  const sectionAnchors = {
    "facturación real":    "facturacion",
    "facturación":         "facturacion",
    "cobranza total":      "cobranza",
    "activo corriente":    "activos",
    "activo no corriente": "activos",
    "pasivo corriente":    "pasivos",
    "pasivo no corriente": "pasivos",
  };

  let currentSection = null;
  let rowsMatched = 0;

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    if (!cells || !cells[0]) continue;

    const rowLabel = String(cells[0]).trim().toLowerCase().replace(/\s+/g, " ");

    for (const [anchor, section] of Object.entries(sectionAnchors)) {
      if (rowLabel === anchor || rowLabel.startsWith(anchor + " ") || rowLabel.includes(anchor)) {
        currentSection = section;
        break;
      }
    }

    let mapping = null;
    let bestLen = 0;
    for (const [key, value] of Object.entries(globalMappings)) {
      if (
        (rowLabel === key || rowLabel.startsWith(key + " ") || rowLabel.includes(key)) &&
        key.length > bestLen
      ) {
        mapping = value;
        bestLen = key.length;
      }
    }

    if (!mapping) {
      for (const [key, sectionMap] of Object.entries(sectionMappings)) {
        if (rowLabel === key || rowLabel.includes(key)) {
          if (currentSection && sectionMap[currentSection]) {
            mapping = sectionMap[currentSection];
          }
          break;
        }
      }
    }

    if (mapping && mapping.key) {
      rowsMatched++;
      Object.entries(monthMap).forEach(([mIdxStr, colIdx]) => {
        const mIdx = parseInt(mIdxStr);
        const rawVal = cells[colIdx];
        if (rawVal !== undefined && rawVal !== null) {
          const parsedVal = parseNumber(rawVal, mapping.isPercent);
          if (parsedVal !== null) {
            setNestedValue(data, mapping.key, mIdx, parsedVal);
          }
        }
      });
    }
  }

  if (rowsMatched === 0) {
    throw new Error(
      "Se encontraron columnas de meses pero ninguna fila coincidió con los indicadores conocidos. Verificá que los nombres de filas sean correctos (Facturación, Cobranza Total, Activo Corriente, etc.)."
    );
  }

  return { data, monthsLoaded: Object.keys(monthMap).length, rowsMatched };
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
      const { data, monthsLoaded, rowsMatched } = parseAndExtractXLSX(arrayBuffer);

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
      setMessage(
        `Importación exitosa. ${monthsLoaded} mes/es cargados con ${rowsMatched} indicadores reconocidos.`
      );
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
