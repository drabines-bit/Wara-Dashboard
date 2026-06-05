import { NextResponse }     from 'next/server';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';

const ODOO_URL   = process.env.ODOO_URL;
const ODOO_DB    = process.env.ODOO_DB;
const ODOO_EMAIL = process.env.ODOO_EMAIL;
const ODOO_KEY   = process.env.ODOO_API_KEY;

function basicAuth() {
  return 'Basic ' + Buffer.from(`${ODOO_EMAIL}:${ODOO_KEY}`).toString('base64');
}

async function odooSearchRead(model, domain, fields, limit = 1000, order = '') {
  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': basicAuth(),
    },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call', id: Math.random(),
      params: {
        model,
        method: 'search_read',
        args:   [domain],
        kwargs: {
          fields,
          limit,
          ...(order ? { order } : {}),
          context: { lang: 'es_AR' },
        },
      },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.data?.message ?? 'Odoo API error');
  return data.result ?? [];
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const missing = ['ODOO_URL', 'ODOO_DB', 'ODOO_EMAIL', 'ODOO_API_KEY']
    .filter(k => !process.env[k]);
  if (missing.length > 0)
    return NextResponse.json(
      { error: `Variables faltantes: ${missing.join(', ')}` },
      { status: 500 }
    );

  try {
    const year = new Date().getFullYear();

    const [invoices2026, outstanding] = await Promise.all([
      odooSearchRead(
        'account.move',
        [
          ['move_type',    '=',  'out_invoice'],
          ['state',        '=',  'posted'],
          ['invoice_date', '>=', `${year}-01-01`],
          ['invoice_date', '<=', `${year}-12-31`],
        ],
        ['partner_id', 'partner_shipping_id', 'amount_total'],
        2000
      ),
      odooSearchRead(
        'account.move',
        [
          ['move_type',     '=',  'out_invoice'],
          ['state',         '=',  'posted'],
          ['payment_state', 'in', ['not_paid', 'partial']],
          ['amount_residual', '>',  0],
        ],
        ['partner_id', 'amount_residual'],
        2000,
        'amount_residual desc'
      ),
    ]);

    const partnerIds = new Set();
    invoices2026.forEach(inv => {
      if (inv.partner_shipping_id?.[0]) partnerIds.add(inv.partner_shipping_id[0]);
      if (inv.partner_id?.[0])          partnerIds.add(inv.partner_id[0]);
    });

    const partners = partnerIds.size > 0
      ? await odooSearchRead(
          'res.partner',
          [['id', 'in', [...partnerIds]]],
          ['id', 'state_id'],
          partnerIds.size + 20
        )
      : [];

    const stateMap = {};
    partners.forEach(p => { stateMap[p.id] = p.state_id?.[1] ?? null; });

    const provinceMap = {};
    invoices2026.forEach(inv => {
      const shippingId = inv.partner_shipping_id?.[0];
      const billingId  = inv.partner_id?.[0];
      const provincia  =
        (shippingId && stateMap[shippingId]) ||
        (billingId  && stateMap[billingId])  ||
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
      const id     = inv.partner_id?.[0];
      const nombre = inv.partner_id?.[1];
      if (!id) return;
      if (!deudorMap[id]) deudorMap[id] = { nombre: nombre ?? '–', deuda: 0 };
      deudorMap[id].deuda += inv.amount_residual ?? 0;
    });

    const topDeudores = Object.values(deudorMap)
      .sort((a, b) => b.deuda - a.deuda)
      .slice(0, 20);

    return NextResponse.json(
      {
        year,
        totalFacturado:   invoices2026.reduce((s, i) => s + (i.amount_total    ?? 0), 0),
        cantidadFacturas: invoices2026.length,
        totalDeuda:       outstanding.reduce((s, i)  => s + (i.amount_residual ?? 0), 0),
        facturacionPorProvincia,
        topDeudores,
      },
      { headers: { 'Cache-Control': 'private, max-age=1800' } }
    );

  } catch (err) {
    console.error('[Odoo]', err.message);
    return NextResponse.json({ error: err.message ?? 'Error Odoo' }, { status: 502 });
  }
}
