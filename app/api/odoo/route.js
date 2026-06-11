import { NextResponse }     from 'next/server';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';

const ODOO_URL   = process.env.ODOO_URL;
const ODOO_DB    = process.env.ODOO_DB;
const ODOO_EMAIL = process.env.ODOO_EMAIL;
const ODOO_KEY   = process.env.ODOO_API_KEY;

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
    throw new Error(data.error.data?.message ?? data.error.message ?? 'JSON-RPC error');
  return data.result;
}

async function searchRead(uid, model, domain, fields, limit = 1000, order = '') {
  return jsonrpc('object', 'execute_kw', [
    ODOO_DB, uid, ODOO_KEY,
    model, 'search_read',
    [domain],
    { fields, limit, ...(order ? { order } : {}) },
  ]);
}

export async function GET() {
  let session;
  try { session = await getServerSession(); }
  catch (e) { return NextResponse.json({ error: 'Error sesión: ' + e.message }, { status: 500 }); }
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const missing = ['ODOO_URL', 'ODOO_DB', 'ODOO_EMAIL', 'ODOO_API_KEY'].filter(k => !process.env[k]);
  if (missing.length > 0)
    return NextResponse.json({ error: `Variables faltantes: ${missing.join(', ')}` }, { status: 500 });

  try {
    const uid = await jsonrpc('common', 'authenticate', [ODOO_DB, ODOO_EMAIL, ODOO_KEY, {}]);
    if (!uid) throw new Error('Autenticación fallida — verificá las credenciales');

    const year = new Date().getFullYear();

    const [invoices, outstanding] = await Promise.all([
      searchRead(uid, 'account.move',
        [['move_type', '=', 'out_invoice'], ['state', '=', 'posted'],
         ['invoice_date', '>=', `${year}-01-01`], ['invoice_date', '<=', `${year}-12-31`]],
        ['partner_id', 'partner_shipping_id', 'amount_total'], 10000),
      searchRead(uid, 'account.move',
        [['move_type', '=', 'out_invoice'], ['state', '=', 'posted'],
         ['payment_state', 'in', ['not_paid', 'partial']], ['amount_residual', '>', 0]],
        ['partner_id', 'amount_residual'], 2000, 'amount_residual desc'),
    ]);

    const partnerIds = new Set();
    invoices.forEach(inv => {
      if (inv.partner_shipping_id?.[0]) partnerIds.add(inv.partner_shipping_id[0]);
      if (inv.partner_id?.[0])          partnerIds.add(inv.partner_id[0]);
    });

    const partners = partnerIds.size > 0
      ? await searchRead(uid, 'res.partner',
          [['id', 'in', [...partnerIds]]], ['id', 'state_id'], partnerIds.size + 20)
      : [];

    const stateMap = {};
    partners.forEach(p => { stateMap[p.id] = p.state_id?.[1] ?? null; });

    const provinceMap = {};
    invoices.forEach(inv => {
      const provincia =
        (inv.partner_shipping_id?.[0] && stateMap[inv.partner_shipping_id[0]]) ||
        (inv.partner_id?.[0]          && stateMap[inv.partner_id[0]])          ||
        'Sin provincia';
      if (!provinceMap[provincia]) provinceMap[provincia] = { total: 0, cantidad: 0 };
      provinceMap[provincia].total    += inv.amount_total ?? 0;
      provinceMap[provincia].cantidad += 1;
    });

    const facturacionPorProvincia = Object.entries(provinceMap)
      .map(([provincia, d]) => ({ provincia, ...d }))
      .sort((a, b) => b.total - a.total);

    const deudorMap = {};
    outstanding.forEach(inv => {
      const id = inv.partner_id?.[0];
      if (!id) return;
      if (!deudorMap[id])
        deudorMap[id] = { nombre: inv.partner_id?.[1] ?? '–', deuda: 0, facturas: 0 };
      deudorMap[id].deuda    += inv.amount_residual ?? 0;
      deudorMap[id].facturas += 1;
    });

    const topDeudores = Object.values(deudorMap)
      .sort((a, b) => b.deuda - a.deuda)
      .slice(0, 20);

    const totalFacturado = invoices.reduce((s, i) => s + (i.amount_total ?? 0), 0);
    const totalDeuda     = outstanding.reduce((s, i) => s + (i.amount_residual ?? 0), 0);

    // ── DSO: Days Sales Outstanding ──────────────────────────────────
    // Deuda pendiente ÷ facturación diaria promedio del año
    const arNow       = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const inicioAnio  = Date.UTC(arNow.getUTCFullYear(), 0, 1);
    const diasTranscurridos = Math.max(1,
      Math.floor((arNow.getTime() - inicioAnio) / 86400000) + 1
    );
    const facturacionDiaria = totalFacturado / diasTranscurridos;
    const dso = facturacionDiaria > 0
      ? Math.round(totalDeuda / facturacionDiaria)
      : null;

    return NextResponse.json(
      {
        year,
        totalFacturado,
        cantidadFacturas: invoices.length,
        totalDeuda,
        facturacionPorProvincia,
        topDeudores,
        dso,
        diasTranscurridos,
      },
      { headers: { 'Cache-Control': 'private, max-age=1800' } }
    );

  } catch (err) {
    console.error('[Odoo]', err.message);
    return NextResponse.json({ error: err.message ?? 'Error Odoo' }, { status: 502 });
  }
}
