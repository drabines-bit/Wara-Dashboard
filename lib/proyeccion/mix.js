import { searchRead } from "@/lib/odoo";
import { rangoMes } from "@/lib/proyeccion/fechas";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

const sinAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Misma agrupación que usa el panel "Mix de Facturación" (app/api/odoo-mix):
// todo lo que no sea Abonos o Instalaciones cae en Otros (envíos, sin categoría, etc).
function clasificarCategoria(cat) {
  const n = sinAcentos(String(cat ?? "").toLowerCase());
  if (n.includes("abono")) return "abonos";
  if (n.includes("instalacion")) return "instalaciones";
  return "otros";
}

let cache = null;

// Ratio de cada categoría sobre el total facturado (IVA incluido), YTD cerrado:
// desde el 1/ene del año de mesCerrado hasta el último día de mesCerrado.
// Usado para proyectar Instalaciones/Otros a partir del MRR de Abonos.
export async function ratiosMixOdoo(mesCerrado) {
  if (cache && cache.mesCerrado === mesCerrado && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.data;
  }

  const anio = mesCerrado.split("-")[0];
  const desde = `${anio}-01-01`;
  const { hasta } = rangoMes(mesCerrado);

  const domain = (tipo) => [
    ["move_type", "=", tipo],
    ["invoice_date", ">=", desde],
    ["invoice_date", "<=", hasta],
  ];
  const [facturas, notasCredito] = await Promise.all([
    searchRead("account.invoice.report", domain("out_invoice"), ["product_categ_id", "price_total"], 100000),
    searchRead("account.invoice.report", domain("out_refund"), ["product_categ_id", "price_total"], 100000),
  ]);

  const buckets = { abonos: 0, instalaciones: 0, otros: 0 };
  const acumular = (filas, signo) => {
    for (const f of filas) {
      const bucket = clasificarCategoria(f.product_categ_id?.[1]);
      buckets[bucket] += signo * Math.abs(f.price_total ?? 0);
    }
  };
  acumular(facturas, 1);
  acumular(notasCredito, -1);

  const total = buckets.abonos + buckets.instalaciones + buckets.otros;
  const data = total > 0
    ? {
        ratioAbonos: buckets.abonos / total,
        ratioInstalaciones: buckets.instalaciones / total,
        ratioOtros: buckets.otros / total,
      }
    : { ratioAbonos: 1, ratioInstalaciones: 0, ratioOtros: 0 };

  cache = { mesCerrado, data, ts: Date.now() };
  return data;
}
