"use client";
import { useState, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import * as XLSX from "xlsx";
import {
  Upload, Scan, Download, Copy, Plus, Trash2, X,
  AlertTriangle, FileText, CheckCircle, Inbox,
  ChevronDown, ChevronUp, Info, Camera, Sun,
  Maximize2, ZapOff, Layers, Check, XCircle
} from "lucide-react";

const WARA_LOGO = "/logo_wara.svg";

const COLS = [
  { key:"fecha_comprobante",  label:"Fecha",        full:"Fecha comprobante",                 w:100 },
  { key:"tipo_comprobante",   label:"Tipo comp.",   full:"Tipo comprobante",                  w:112 },
  { key:"cuit_proveedor",     label:"CUIT",         full:"CUIT Proveedor",                    w:120 },
  { key:"denominacion",       label:"Denominación", full:"Denominación",                      w:158 },
  { key:"punto_venta",        label:"Pto.",          full:"Punto de Venta",                   w: 54 },
  { key:"numero_comprobante", label:"Nro. comp.",   full:"Número comprobante",                w:100 },
  { key:"neto_21",            label:"Neto 21%",     full:"Neto 21%",                          w: 88, num:true },
  { key:"iva_21",             label:"IVA 21%",      full:"IVA 21%",                           w: 82, num:true },
  { key:"neto_105",           label:"Neto 10,5%",   full:"Neto 10,5%",                        w: 88, num:true },
  { key:"iva_105",            label:"IVA 10,5%",    full:"IVA 10,5%",                         w: 82, num:true },
  { key:"neto_27",            label:"Neto 27%",     full:"Neto 27%",                          w: 88, num:true },
  { key:"iva_27",             label:"IVA 27%",      full:"IVA 27%",                           w: 82, num:true },
  { key:"exento_no_gravado",  label:"Exento/NG",    full:"IVA Exento/No Gravado",             w: 88, num:true },
  { key:"otros_tributos",     label:"Otros trib.",  full:"Otros Tributos/impuestos Internos", w: 90, num:true },
  { key:"percep_iibb_mza",    label:"IIBB MZA",     full:"Percep IIBB MZA",                   w: 84, num:true },
  { key:"percep_iibb_caba",   label:"IIBB CABA",    full:"Percep IIBB CABA",                  w: 90, num:true },
  { key:"percep_iva",         label:"Perc. IVA",    full:"Percepción IVA",                    w: 84, num:true },
  { key:"total_comprobante",  label:"Total",        full:"Total comprobante",                 w:100, num:true },
];

const MAX_BATCH = 20;

const TIPS = [
  { Icon: Sun,       text: "Fotografiá con buena iluminación ambiental. Evitá sombras y reflejos sobre el papel." },
  { Icon: Camera,    text: "Apuntá la cámara desde arriba, de forma perpendicular al comprobante." },
  { Icon: Maximize2, text: "Encuadrá el comprobante completo, sin cortar ningún borde." },
  { Icon: ZapOff,    text: "Esperá el enfoque automático antes de capturar; evitá imágenes borrosas o movidas." },
  { Icon: Layers,    text: "Podés subir varios tickets en una imagen, pero asegurate de que no se superpongan." },
  { Icon: AlertTriangle, text: "Máximo 20 comprobantes por lote. Lotes más grandes reducen la precisión del análisis.", warn: true },
];

const toB64 = (f) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

const emptyRow = () =>
  Object.fromEntries([...COLS.map((c) => [c.key, ""]), ["observaciones", ""]]);

function parseARS(str) {
  if (str === null || str === undefined || str === "" || str === "ILEGIBLE") return null;
  const s = String(str).trim();
  if (s === "null" || s === "-" || s === "N/A") return null;
  const clean = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function fmtARS(n) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TOL = 0.02;

function validateRow(row) {
  const g = (k) => parseARS(row[k]);

  const neto21   = g("neto_21");
  const iva21    = g("iva_21");
  const neto105  = g("neto_105");
  const iva105   = g("iva_105");
  const neto27   = g("neto_27");
  const iva27    = g("iva_27");
  const exento   = g("exento_no_gravado");
  const otros    = g("otros_tributos");
  const iibbMza  = g("percep_iibb_mza");
  const iibbCaba = g("percep_iibb_caba");
  const percIva  = g("percep_iva");
  const total    = g("total_comprobante");

  const checks = [];

  const components = [neto21, iva21, neto105, iva105, neto27, iva27,
                      exento, otros, iibbMza, iibbCaba, percIva];
  const hasAny = components.some((v) => v !== null);
  if (total !== null && hasAny) {
    const calcTotal = components.reduce((s, v) => s + (v ?? 0), 0);
    const diff = Math.abs(total - calcTotal);
    checks.push({
      label:   "Total del comprobante",
      formula: "Σ Neto + IVA + Percepciones",
      scanned: total,
      calc:    Math.round(calcTotal * 100) / 100,
      ok:      diff <= TOL,
      diff:    Math.round(diff * 100) / 100,
    });
  }

  if (neto21 !== null && iva21 !== null) {
    const calcIVA = Math.round(neto21 * 0.21 * 100) / 100;
    const diff    = Math.abs(iva21 - calcIVA);
    checks.push({
      label:   "IVA 21%",
      formula: "Neto 21% × 0,21",
      scanned: iva21,
      calc:    calcIVA,
      ok:      diff <= TOL,
      diff:    Math.round(diff * 100) / 100,
    });
  }

  return checks;
}

function validationTooltip(checks) {
  return checks.map((c) =>
    `${c.label} (${c.formula})\n` +
    `  Escaneado : ${fmtARS(c.scanned)}\n` +
    `  Calculado : ${fmtARS(c.calc)}\n` +
    (c.ok ? `  ✓ Coincide` : `  ⚠ Diferencia: ${fmtARS(c.diff)}`)
  ).join("\n\n");
}

const BP = "#8B0028";
const BM = "#A8003A";
const BL = "#FCF0F3";
const BB = "#F0C0CC";
const BE = "#0E9F6E";

export default function EscanerClient({ userName, userImage, userLogin }) {
  const [imgs,     setImgs]     = useState([]);
  const [rows,     setRows]     = useState([]);
  const [warns,    setWarns]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [drag,     setDrag]     = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [tipsOpen, setTipsOpen] = useState(true);
  const fileRef = useRef();

  const addFiles = useCallback(async (files) => {
    const valid = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (!valid.length) return;
    const loaded = await Promise.all(
      valid.map(async (f) => ({
        url:   f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
        b64:   await toB64(f),
        type:  f.type,
        name:  f.name,
        isPdf: f.type === "application/pdf",
      }))
    );
    setImgs((p) => [...p, ...loaded]);
  }, []);

  const removeImg = (i) =>
    setImgs((p) => { URL.revokeObjectURL(p[i]?.url); return p.filter((_, idx) => idx !== i); });

  const analyze = async () => {
    if (!imgs.length || loading) return;
    setLoading(true);
    setWarns([]);
    try {
      const files = imgs.map((img) => ({
        b64:       img.b64,
        mediaType: img.type,
        isPdf:     img.isPdf,
      }));

      const res = await fetch("/api/escaner-iva/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ files, imageCount: imgs.length }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const parsed = await res.json();
      const newRows = parsed.comprobantes || [];
      setRows((p) => [...p, ...newRows]);

      const allWarns = [];
      if (imgs.length > MAX_BATCH)
        allWarns.push({ kind: "warning",
          text: `Lote de ${imgs.length} imágenes supera el máximo recomendado de ${MAX_BATCH}.` });
      if (parsed.advertencias)
        allWarns.push({ kind: "general", text: parsed.advertencias });
      newRows.forEach((r, i) => {
        if (r.observaciones) allWarns.push({ kind: "row", idx: i + 1, text: r.observaciones });
      });
      setWarns(allWarns);
      setImgs([]);
    } catch (e) {
      setWarns([{ kind: "error", text: e instanceof Error ? e.message : "Error desconocido" }]);
    } finally {
      setLoading(false);
    }
  };

  const editCell  = (ri, key, val) => setRows((p) => p.map((r, i) => i === ri ? { ...r, [key]: val } : r));
  const deleteRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i));

  const exportXLSX = () => {
    const data = rows.map((r) => {
      const o = {};
      COLS.forEach((c) => { o[c.full] = r[c.key] ?? ""; });
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "IVA Compras 2026");
    XLSX.writeFile(wb, "IVA_Compras_2026.xlsx");
  };

  const copyTSV = () => {
    const h = COLS.map((c) => c.full).join("\t");
    const b = rows.map((r) => COLS.map((c) => r[c.key] ?? "").join("\t")).join("\n");
    navigator.clipboard.writeText(`${h}\n${b}`);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  const ilegCount = rows.filter((r) => Object.values(r).some((v) => v === "ILEGIBLE")).length;
  const isError   = warns.length > 0 && warns[0].kind === "error";
  const allValidations = rows.map(validateRow);
  const failCount = allValidations.filter((checks) => checks.some((c) => !c.ok)).length;
  const warnKind  = warns.length > 0 ? warns[0].kind : null;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
    .w-root{font-family:'Outfit',var(--font-sans),sans-serif;color:var(--color-text-primary)}
    .w-topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)}
    .w-topbar-left{display:flex;align-items:center;gap:14px}
    .w-divider{width:0.5px;height:32px;background:var(--color-border-secondary)}
    .w-topbar-text h1{font-size:14px;font-weight:600;line-height:1.2;margin:0}
    .w-topbar-text p{font-size:11px;color:var(--color-text-secondary);margin:2px 0 0}
    .w-badge{font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;background:${BL};color:${BP};border:0.5px solid ${BB};border-radius:20px;padding:3px 11px}
    .w-main{padding:20px 20px 28px;display:flex;flex-direction:column;gap:16px}
    .w-tips{background:var(--color-background-info);border:0.5px solid var(--color-border-info);border-radius:var(--border-radius-lg);overflow:hidden}
    .w-tips-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;user-select:none}
    .w-tips-title{font-size:12px;font-weight:600;color:var(--color-text-info);display:flex;align-items:center;gap:6px}
    .w-tips-body{padding:4px 14px 14px;display:flex;flex-direction:column;gap:8px}
    .w-tip{display:flex;align-items:flex-start;gap:10px}
    .w-tip-icon{flex-shrink:0;margin-top:1px}
    .w-tip-text{font-size:12.5px;color:var(--color-text-secondary);line-height:1.5}
    .w-tip.warn .w-tip-text{color:var(--color-text-warning);font-weight:500}
    .w-panel{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden}
    .w-panel-head{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:0.5px solid var(--color-border-tertiary);background:var(--color-background-secondary);flex-wrap:wrap;gap:8px}
    .w-panel-title{font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--color-text-secondary);display:flex;align-items:center;gap:6px}
    .w-dot{width:6px;height:6px;border-radius:50%;background:${BP};flex-shrink:0}
    .w-panel-body{padding:16px}
    .w-drop{border:1.5px dashed var(--color-border-secondary);border-radius:var(--border-radius-md);padding:30px 20px;text-align:center;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:10px}
    .w-drop:hover,.w-drop.over{border-color:${BP};background:${BL}}
    .w-drop-icon{width:46px;height:46px;border-radius:50%;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);display:flex;align-items:center;justify-content:center;transition:all .15s}
    .w-drop:hover .w-drop-icon,.w-drop.over .w-drop-icon{background:${BL};border-color:${BB}}
    .w-drop-title{font-size:14px;font-weight:500}
    .w-drop-sub{font-size:12px;color:var(--color-text-tertiary)}
    .w-batch-warn{margin-top:8px;background:var(--color-background-warning);border:0.5px solid var(--color-border-warning);border-radius:var(--border-radius-md);padding:7px 12px;font-size:12px;font-weight:500;color:var(--color-text-warning);display:flex;align-items:center;gap:6px}
    .w-thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
    .w-thumb{position:relative}
    .w-thumb img{width:72px;height:72px;object-fit:cover;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-tertiary);display:block}
    .w-thumb-pdf{width:72px;height:72px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-tertiary);background:var(--color-background-secondary);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
    .w-thumb-pdf span{font-size:9px;color:var(--color-text-tertiary);font-family:'JetBrains Mono',monospace;max-width:66px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .w-thumb-del{position:absolute;top:-5px;right:-5px;width:18px;height:18px;border-radius:50%;background:var(--color-background-danger);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
    .w-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:14px}
    .w-btn{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:transparent;color:var(--color-text-primary);font-size:13px;font-weight:500;cursor:pointer;font-family:'Outfit',var(--font-sans),sans-serif;transition:background .12s}
    .w-btn:hover{background:var(--color-background-secondary)}
    .w-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:var(--border-radius-md);border:none;background:${BP};color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:'Outfit',var(--font-sans),sans-serif;transition:all .12s}
    .w-btn-primary:disabled{opacity:.38;cursor:not-allowed}
    .w-btn-primary:not(:disabled):hover{background:${BM}}
    .w-btn-export{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:var(--border-radius-md);border:none;background:${BE};color:#fff;font-size:13px;font-weight:500;cursor:pointer;font-family:'Outfit',var(--font-sans),sans-serif;transition:opacity .12s}
    .w-btn-export:hover{opacity:.88}
    .w-btn-danger{display:inline-flex;align-items:center;padding:7px 10px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-danger);background:transparent;color:var(--color-text-danger);font-size:13px;cursor:pointer;font-family:'Outfit',var(--font-sans),sans-serif}
    .w-btn-danger:hover{background:var(--color-background-danger)}
    @keyframes w-spin{to{transform:rotate(360deg)}}
    .w-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:w-spin .65s linear infinite;display:inline-block}
    .w-warn{border-radius:var(--border-radius-md);padding:12px 14px;display:flex;flex-direction:column;gap:5px}
    .w-warn.general{background:var(--color-background-warning);border:0.5px solid var(--color-border-warning)}
    .w-warn.warning{background:var(--color-background-warning);border:0.5px solid var(--color-border-warning)}
    .w-warn.error{background:var(--color-background-danger);border:0.5px solid var(--color-border-danger)}
    .w-warn-head{font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px}
    .w-warn.general .w-warn-head,.w-warn.warning .w-warn-head{color:var(--color-text-warning)}
    .w-warn.error .w-warn-head{color:var(--color-text-danger)}
    .w-warn-item{font-size:11.5px;font-family:'JetBrains Mono',monospace}
    .w-warn.general .w-warn-item,.w-warn.warning .w-warn-item{color:var(--color-text-warning)}
    .w-warn.error .w-warn-item{color:var(--color-text-danger)}
    .w-pills{display:flex;gap:8px;flex-wrap:wrap}
    .w-pill{display:inline-flex;align-items:center;gap:4px;border-radius:20px;padding:3px 10px;font-size:12px;font-weight:500;border:0.5px solid var(--color-border-tertiary);background:var(--color-background-secondary);color:var(--color-text-secondary)}
    .w-pill strong{font-weight:600;color:var(--color-text-primary)}
    .w-pill.warn{background:var(--color-background-warning);border-color:var(--color-border-warning);color:var(--color-text-warning)}
    .w-pill.warn strong{color:var(--color-text-warning)}
    .w-pill.ok{background:var(--color-background-success);border-color:var(--color-border-success);color:var(--color-text-success)}
    .w-pill.ok strong{color:var(--color-text-success)}
    .w-pill.err{background:var(--color-background-danger);border-color:var(--color-border-danger);color:var(--color-text-danger)}
    .w-pill.err strong{color:var(--color-text-danger)}
    .w-tbl-wrap{overflow-x:auto}
    .w-tbl{border-collapse:collapse;width:max-content;min-width:100%}
    .w-tbl thead th{background:var(--color-background-secondary);color:var(--color-text-secondary);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:9px 8px;white-space:nowrap;text-align:left;border-bottom:0.5px solid var(--color-border-tertiary);font-family:'Outfit',var(--font-sans),sans-serif;position:sticky;top:0}
    .w-tbl thead th.num{text-align:right}
    .w-tbl thead th.th-del{width:30px}
    .w-tbl thead th.th-val{width:64px;text-align:center;border-left:0.5px solid var(--color-border-secondary)}
    .w-tbl tbody tr{border-bottom:0.5px solid var(--color-border-tertiary);transition:background .08s}
    .w-tbl tbody tr:last-child{border-bottom:none}
    .w-tbl tbody tr:hover{background:var(--color-background-secondary)}
    .w-tbl tbody tr.ileg{background:var(--color-background-warning)}
    .w-tbl td{padding:2px 5px;vertical-align:middle}
    .w-cell{background:transparent;border:none;color:var(--color-text-primary);font-size:11.5px;font-weight:400;font-family:'JetBrains Mono',monospace;width:100%;padding:4px;border-radius:4px;outline:none}
    .w-cell:focus{background:var(--color-background-secondary)}
    .w-cell.num{text-align:right}
    .w-cell.ileg{color:var(--color-text-danger);font-weight:500}
    .w-del-btn{background:none;border:none;cursor:pointer;padding:4px;border-radius:4px;color:var(--color-text-tertiary);display:inline-flex;transition:all .1s}
    .w-del-btn:hover{color:var(--color-text-danger);background:var(--color-background-danger)}
    .col-sep{border-left:0.5px solid var(--color-border-secondary)!important}
    .td-val{border-left:0.5px solid var(--color-border-secondary);text-align:center;padding:2px 6px!important;white-space:nowrap}
    .val-ok{display:inline-flex;align-items:center;justify-content:center;gap:3px;color:#059669;font-size:12px;font-weight:600;cursor:help}
    .val-warn{display:inline-flex;align-items:center;justify-content:center;gap:3px;color:#D97706;font-size:12px;font-weight:600;cursor:help}
    .val-none{color:var(--color-text-tertiary);font-size:13px}
    .w-empty{padding:48px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--color-text-tertiary)}
    .w-empty p{font-size:13px}
    .w-empty .sub{font-size:12px}
    .w-res-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;width:100%}
    .w-res-right{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    .w-footer{font-size:11px;color:var(--color-text-tertiary);text-align:center;padding-bottom:4px}
  `;

  return (
    <>
      <style>{css}</style>
      <div className="w-root">

        {/* ── TOPBAR ── */}
        <div className="w-topbar">
          <div className="w-topbar-left">
            <img src={WARA_LOGO} alt="Wara GPS" style={{ height:34, width:"auto", objectFit:"contain" }} />
            <div className="w-divider" />
            <div className="w-topbar-text">
              <h1>Escáner IVA compras</h1>
              <p>Blo, Bienestar, Logística y Organización S.A.</p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span className="w-badge">2026</span>
            <div style={{ display:"flex", alignItems:"center", gap:8,
              paddingLeft:12, borderLeft:"0.5px solid var(--color-border-tertiary)" }}>
              {userImage && (
                <img src={userImage} alt={userName}
                  style={{ width:24, height:24, borderRadius:"50%", border:"0.5px solid #e2e8f0" }} />
              )}
              <span style={{ fontSize:12, color:"var(--color-text-secondary)" }}>
                @{userLogin}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/escaner-iva/login" })}
                style={{ fontSize:12, color:"var(--color-text-tertiary)", background:"none",
                  border:"none", cursor:"pointer", padding:"2px 6px" }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="w-main">

          {/* ── TIPS ── */}
          <div className="w-tips">
            <div className="w-tips-head" onClick={() => setTipsOpen((o) => !o)}>
              <span className="w-tips-title">
                <Info size={13} />
                Recomendaciones para el escaneo
              </span>
              {tipsOpen ? <ChevronUp size={14} color="var(--color-text-info)" /> : <ChevronDown size={14} color="var(--color-text-info)" />}
            </div>
            {tipsOpen && (
              <div className="w-tips-body">
                {TIPS.map(({ Icon, text, warn }, i) => (
                  <div key={i} className={`w-tip${warn ? " warn" : ""}`}>
                    <span className="w-tip-icon">
                      <Icon size={14} color={warn ? "var(--color-text-warning)" : "var(--color-text-info)"} />
                    </span>
                    <span className="w-tip-text">{text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── PANEL: CARGA ── */}
          <div className="w-panel">
            <div className="w-panel-head">
              <span className="w-panel-title">
                <span className="w-dot" />Cargar comprobantes
              </span>
              {imgs.length > 0 && (
                <span style={{ fontSize:12, color: imgs.length > MAX_BATCH ? "var(--color-text-warning)" : "var(--color-text-secondary)" }}>
                  {imgs.length}/{MAX_BATCH} archivos{imgs.length > MAX_BATCH ? " — límite superado" : ""}
                </span>
              )}
            </div>
            <div className="w-panel-body">
              <input
                type="file"
                ref={fileRef}
                style={{ display: "none" }}
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
              <div
                className={`w-drop${drag ? " over" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
              >
                <div className="w-drop-icon">
                  <Upload size={20} color={drag ? BP : "var(--color-text-secondary)"} />
                </div>
                <div className="w-drop-title">
                  {drag ? "Soltá los archivos aquí" : "Arrastrá imágenes o PDF, o hacé click para seleccionar"}
                </div>
                <div className="w-drop-sub">JPG · PNG · WEBP · PDF · Múltiples archivos a la vez</div>
              </div>

              {imgs.length > MAX_BATCH && (
                <div className="w-batch-warn">
                  <AlertTriangle size={13} />
                  Superaste el límite de {MAX_BATCH} comprobantes por lote. Recomendamos dividirlos para mayor precisión.
                </div>
              )}

              {imgs.length > 0 && (
                <div className="w-thumbs">
                  {imgs.map((img, i) => (
                    <div key={i} className="w-thumb">
                      {img.isPdf ? (
                        <div className="w-thumb-pdf">
                          <FileText size={22} color="var(--color-text-danger)" />
                          <span title={img.name}>{img.name.length > 10 ? img.name.slice(0, 9) + "…" : img.name}</span>
                        </div>
                      ) : (
                        <img src={img.url} alt={img.name} title={img.name} />
                      )}
                      <button className="w-thumb-del" onClick={() => removeImg(i)} aria-label={`Quitar ${img.name}`}>
                        <X size={10} color="var(--color-text-danger)" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="w-actions">
                <button className="w-btn-primary" onClick={analyze} disabled={!imgs.length || loading}>
                  {loading
                    ? <><span className="w-spinner" />Analizando...</>
                    : <><Scan size={14} />Analizar{imgs.length > 0 ? ` (${imgs.length})` : ""}</>
                  }
                </button>
                {imgs.length > 0 && (
                  <button className="w-btn" onClick={() => setImgs([])}><X size={13} />Limpiar</button>
                )}
              </div>
            </div>
          </div>

          {/* ── ADVERTENCIAS ── */}
          {warns.length > 0 && (
            <div className={`w-warn ${warnKind || "general"}`}>
              <div className="w-warn-head">
                <AlertTriangle size={13} />
                {isError ? "Error al procesar" : "Advertencias del análisis"}
              </div>
              {warns.map((w, i) => (
                <div key={i} className="w-warn-item">
                  {w.kind === "row" ? `Comprobante ${w.idx}: ` : ""}{w.text}
                </div>
              ))}
            </div>
          )}

          {/* ── PANEL: RESULTADOS ── */}
          <div className="w-panel">
            <div className="w-panel-head">
              <div className="w-res-bar">
                <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                  <span className="w-panel-title"><span className="w-dot" />Libro IVA compras 2026</span>
                  {rows.length > 0 && (
                    <div className="w-pills">
                      <span className="w-pill">
                        <strong>{rows.length}</strong> comprobante{rows.length !== 1 ? "s" : ""}
                      </span>
                      {ilegCount > 0 && (
                        <span className="w-pill warn">
                          <AlertTriangle size={10} />
                          <strong>{ilegCount}</strong> ilegible{ilegCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {failCount > 0 && (
                        <span className="w-pill err">
                          <XCircle size={10} />
                          <strong>{failCount}</strong> con error de validación
                        </span>
                      )}
                      {rows.length > 0 && failCount === 0 && allValidations.some((v) => v.length > 0) && (
                        <span className="w-pill ok">
                          <Check size={10} />
                          Validaciones OK
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="w-res-right">
                  <button className="w-btn" onClick={() => setRows((p) => [...p, emptyRow()])}>
                    <Plus size={13} />Agregar fila
                  </button>
                  {rows.length > 0 && (
                    <>
                      <button className="w-btn" onClick={copyTSV}>
                        {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
                        {copied ? "Copiado" : "Copiar TSV"}
                      </button>
                      <button className="w-btn-export" onClick={exportXLSX}>
                        <Download size={13} />Exportar XLSX
                      </button>
                      <button className="w-btn-danger"
                        onClick={() => { if (window.confirm("¿Limpiar todos los resultados?")) setRows([]); }}
                        title="Limpiar resultados">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="w-tbl-wrap">
              {rows.length === 0 ? (
                <div className="w-empty">
                  <div style={{ opacity:.3 }}><Inbox size={36} /></div>
                  <p>Todavía no hay comprobantes cargados.</p>
                  <p className="sub">Subí imágenes de facturas o tickets y hacé click en Analizar.</p>
                </div>
              ) : (
                <table className="w-tbl">
                  <thead>
                    <tr>
                      <th className="th-del" />
                      {COLS.map((c, ci) => (
                        <th key={c.key}
                          className={[c.num ? "num" : "", [6, 12, 13].includes(ci) ? "col-sep" : ""].filter(Boolean).join(" ")}
                          style={{ minWidth: c.w }} title={c.full}>
                          {c.label}
                        </th>
                      ))}
                      <th className="th-val" title="Validación automática: total y fórmulas de IVA">Val.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => {
                      const hasIleg = Object.values(row).some((v) => v === "ILEGIBLE");
                      const checks  = allValidations[ri] || [];
                      const failed  = checks.filter((c) => !c.ok);
                      const allOk   = checks.length > 0 && failed.length === 0;
                      const noData  = checks.length === 0;
                      const tooltip = checks.length > 0 ? validationTooltip(checks) : "Sin datos suficientes para validar";

                      return (
                        <tr key={ri} className={hasIleg ? "ileg" : ""}>
                          <td style={{ width:30, textAlign:"center", padding:"2px 4px" }}>
                            <button className="w-del-btn" onClick={() => deleteRow(ri)} title="Eliminar"><X size={12} /></button>
                          </td>
                          {COLS.map((c, ci) => {
                            const val    = row[c.key] ?? "";
                            const isIleg = val === "ILEGIBLE";
                            return (
                              <td key={c.key}
                                style={{ minWidth: c.w, padding:"2px 4px" }}
                                className={[6, 12, 13].includes(ci) ? "col-sep" : ""}>
                                <input
                                  className={["w-cell", c.num ? "num" : "", isIleg ? "ileg" : ""].filter(Boolean).join(" ")}
                                  value={val}
                                  onChange={(e) => editCell(ri, c.key, e.target.value)}
                                  title={isIleg ? "⚠ Dato ilegible — verificar manualmente" : c.full}
                                  style={{ minWidth: c.w - 16 }}
                                />
                              </td>
                            );
                          })}
                          <td className="td-val">
                            {noData ? (
                              <span className="val-none" title={tooltip}>—</span>
                            ) : allOk ? (
                              <span className="val-ok" title={tooltip}>
                                <Check size={12} />OK
                              </span>
                            ) : (
                              <span className="val-warn" title={tooltip}>
                                <AlertTriangle size={12} />{failed.length}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="w-footer">
            Wara GPS · Blo S.A. · IVA Compras 2026 · OCR powered by Claude AI
          </div>
        </div>
      </div>
    </>
  );
}
