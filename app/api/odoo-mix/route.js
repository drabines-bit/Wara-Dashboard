import { NextResponse }     from 'next/server';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';

const ODOO_URL   = process.env.ODOO_URL;
const ODOO_DB    = process.env.ODOO_DB;
const ODOO_EMAIL = process.env.ODOO_EMAIL;
const ODOO_KEY   = process.env.ODOO_API_KEY;

const MERGE_INTO = 'Envíos e instalaciones menores';
const MESES      = ['ene','feb','mar','abr','may','jun',
                    'jul','ago','sep','oct','nov','dic'];

function debeUnirse(cat) {
  const n = (cat ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Matchea "envios", "todos", "all", "todos / saleable" y variantes
  // con ruta de árbol de categorías de Odoo
  return n.includes('envio') || n.includes('todos') ||
         n.includes('saleable') || n === 'all' || n === 'todo';
}

async function jsonrpc(service, method, args) {
  const res = await fetch(`${ODOO_URL}/jsonrpc`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: Date.now(),
      params: { service, method, args },
    }),
  });
  const data = await res.json();
  if (data.error)
    throw new Error(data.error.data?.message ?? data.error.message ?? 'Error JSON-RPC');
  return data.result;
}

export async function GET() {
  let session;
  try { session = await getServerSession(); }
  catch (e) { return NextResponse.json({ error: 'Error sesión' }, { status: 500 }); }
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const missing = ['ODOO_URL','ODOO_DB','ODOO_EMAIL','ODOO_API_KEY'].filter(k => !process.env[k]);
  if (missing.length > 0)
    return NextResponse.json({ error: `Variables faltantes: ${missing.join(', ')}` }, { status: 500 });

  try {
    const uid = await jsonrpc('common', 'authenticate', [ODOO_DB, ODOO_EMAIL, ODOO_KEY, {}]);
    if (!uid) throw new Error('Autenticación Odoo fallida');

    const arNow    = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const year     = arNow.getUTCFullYear();
    const arMonth  = arNow.getUTCMonth();
    const arMonthN = arMonth + 1;
    const lastDay  = new Date(Date.UTC(year, arMonthN, 0)).getUTCDate();
    const startDate = `${year}-01-01`;
    const endDate   = `${year}-${String(arMonthN).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

    const lines = await jsonrpc('object', 'execute_kw', [
      ODOO_DB, uid, ODOO_KEY,
      'account.invoice.report', 'search_read',
      [[
        ['move_type',    'in', ['out_invoice', 'out_refund']],
        ['invoice_date', '>=', startDate],
        ['invoice_date', '<=', endDate],
      ]],
      {
        fields: ['product_categ_id', 'invoice_date', 'price_total', 'move_type'],
        limit:  100000,
      },
    ]);

    const pivot   = {};
    const allCats = new Set();

    lines.forEach(line => {
      if (!line.invoice_date) return;
      const monthIdx = parseInt(line.invoice_date.substring(5, 7)) - 1;
      if (monthIdx < 0 || monthIdx > arMonth) return;

      const rawCat = line.product_categ_id?.[1] ?? 'Sin categoría';
      const cat    = debeUnirse(rawCat) ? MERGE_INTO : rawCat;

      allCats.add(cat);
      if (!pivot[monthIdx])      pivot[monthIdx]      = {};
      if (!pivot[monthIdx][cat]) pivot[monthIdx][cat] = 0;
      // Facturas suman, notas de crédito restan.
      // Math.abs + signo explícito cubre ambas convenciones de Odoo
      // (algunas versiones ya devuelven el monto negativo en refunds).
      const monto = Math.abs(line.price_total ?? 0);
      pivot[monthIdx][cat] += line.move_type === 'out_refund' ? -monto : monto;
    });

    const CAT_ORDER = ['Abonos', 'INSTALACIONES', MERGE_INTO];
    const categorias = [
      ...CAT_ORDER.filter(c => allCats.has(c)),
      ...[...allCats].filter(c => !CAT_ORDER.includes(c)).sort(),
    ];

    const meses = Array.from({ length: arMonth + 1 }, (_, i) => {
      const catData  = pivot[i] ?? {};
      const rowTotal = Object.values(catData).reduce((s, v) => s + v, 0);
      return { mes: i + 1, nombre: MESES[i], data: catData, total: rowTotal };
    });

    const ytd = {};
    categorias.forEach(cat => {
      ytd[cat] = meses.reduce((s, m) => s + (m.data[cat] ?? 0), 0);
    });

    // Excluir categorías sin movimiento neto en el año
    const categoriasFinales = categorias.filter(c => Math.abs(ytd[c] ?? 0) >= 1);
    categorias.length = 0;
    categorias.push(...categoriasFinales);

    const ytdTotal = Object.values(ytd).reduce((s, v) => s + v, 0);

    return NextResponse.json(
      { year, startDate, endDate, categorias, meses, ytd, ytdTotal },
      { headers: { 'Cache-Control': 'private, max-age=1800' } }
    );

  } catch (err) {
    console.error('[Odoo Mix]', err.message);
    return NextResponse.json({ error: err.message ?? 'Error Odoo Mix' }, { status: 502 });
  }
}
