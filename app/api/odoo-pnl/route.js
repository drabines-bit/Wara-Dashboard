import { NextResponse }     from 'next/server';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';

const ODOO_URL   = process.env.ODOO_URL;
const ODOO_DB    = process.env.ODOO_DB;
const ODOO_EMAIL = process.env.ODOO_EMAIL;
const ODOO_KEY   = process.env.ODOO_API_KEY;

const INCOME_TYPES = ['income', 'income_other'];
const COGS_TYPES   = ['expense_direct_cost'];
const OPEX_TYPES   = ['expense'];
const DEPR_TYPES   = ['expense_depreciation'];

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

// Calcula el monto según el grupo contable de la cuenta:
// Ingresos: credit - debit  (balance negativo en Odoo → positivo para nosotros)
// Gastos:   debit - credit  (balance positivo en Odoo → positivo para nosotros)
function monto(debit, credit, internalGroup) {
  return internalGroup === 'income' ? credit - debit : debit - credit;
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

    // ── Rango exacto: 1 de enero al último día del mes actual (hora Argentina) ──
    const utcNow   = new Date();
    const arNow    = new Date(utcNow.getTime() - 3 * 60 * 60 * 1000); // UTC-3 fijo
    const year     = arNow.getUTCFullYear();
    const arMonth  = arNow.getUTCMonth();     // 0-indexed (junio = 5)
    const arMonthN = arMonth + 1;             // 1-indexed (junio = 6)
    const lastDay  = new Date(Date.UTC(year, arMonthN, 0)).getUTCDate();
    const startDate = `${year}-01-01`;
    const endDate   = `${year}-${String(arMonthN).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

    // ── Dominio idéntico al Python validado ──────────────────────────────────
    const domain = [
      ['account_id.internal_group', 'in', ['income', 'expense']],
      ['parent_state',              '=',  'posted'],
      ['date',                      '>=', startDate],
      ['date',                      '<=', endDate],
    ];

    // ── 1. Totales YTD por cuenta (read_group, como el Python) ───────────────
    const ytdGroups = await jsonrpc('object', 'execute_kw', [
      ODOO_DB, uid, ODOO_KEY,
      'account.move.line', 'read_group',
      [domain],
      { fields: ['account_id', 'debit', 'credit'], groupby: ['account_id'] },
    ]);

    // ── 2. Líneas individuales para el desglose mensual ──────────────────────
    const monthlyLines = await jsonrpc('object', 'execute_kw', [
      ODOO_DB, uid, ODOO_KEY,
      'account.move.line', 'search_read',
      [domain],
      { fields: ['account_id', 'date', 'debit', 'credit'], limit: 10000, order: 'date asc' },
    ]);

    // ── 3. Detalles de las cuentas (una sola query) ──────────────────────────
    const accountIds = [...new Set([
      ...ytdGroups.map(g => g.account_id[0]),
      ...monthlyLines.map(l => l.account_id[0]),
    ])];

    const accounts = accountIds.length > 0
      ? await jsonrpc('object', 'execute_kw', [
          ODOO_DB, uid, ODOO_KEY,
          'account.account', 'search_read',
          [[['id', 'in', accountIds]]],
          {
            fields: ['id', 'name', 'code', 'account_type', 'internal_group'],
            limit:  accountIds.length + 10,
          },
        ])
      : [];

    const accountMap = {};
    accounts.forEach(a => { accountMap[a.id] = a; });

    // ── 4. Procesar YTD ──────────────────────────────────────────────────────
    const cuentas = ytdGroups.map(g => {
      const acc = accountMap[g.account_id[0]];
      if (!acc) return null;
      return {
        id:     g.account_id[0],
        codigo: acc.code,
        nombre: acc.name,
        tipo:   acc.account_type,
        grupo:  acc.internal_group,
        monto:  monto(g.debit ?? 0, g.credit ?? 0, acc.internal_group),
      };
    }).filter(Boolean).sort((a, b) => a.codigo.localeCompare(b.codigo));

    const sum = (tipos) => cuentas
      .filter(c => tipos.includes(c.tipo))
      .reduce((s, c) => s + c.monto, 0);

    const ingresos         = sum(INCOME_TYPES);
    const costoVentas      = sum(COGS_TYPES);
    const gastosOperativos = sum(OPEX_TYPES);
    const depreciaciones   = sum(DEPR_TYPES);
    const resultadoBruto   = ingresos - costoVentas;
    const resultadoNeto    = resultadoBruto - gastosOperativos - depreciaciones;

    // ── 5. Desglose mensual (enero → mes actual) ─────────────────────────────
    const meses = Array.from({ length: 12 }, (_, i) => ({
      mes:    i + 1,
      nombre: new Date(year, i, 1).toLocaleString('es-AR', {
        month: 'short', timeZone: 'America/Argentina/Buenos_Aires',
      }),
      ingresos: 0, costoVentas: 0, gastosOperativos: 0, depreciaciones: 0,
    }));

    monthlyLines.forEach(line => {
      const acc = accountMap[line.account_id?.[0]];
      if (!acc || !line.date) return;
      const idx = parseInt(line.date.substring(5, 7)) - 1; // 0-indexed
      if (idx < 0 || idx > arMonth) return;

      const m = monto(line.debit ?? 0, line.credit ?? 0, acc.internal_group);

      if      (INCOME_TYPES.includes(acc.account_type)) meses[idx].ingresos         += m;
      else if (COGS_TYPES.includes(acc.account_type))   meses[idx].costoVentas       += m;
      else if (OPEX_TYPES.includes(acc.account_type))   meses[idx].gastosOperativos  += m;
      else if (DEPR_TYPES.includes(acc.account_type))   meses[idx].depreciaciones    += m;
    });

    const mensual = meses.slice(0, arMonth + 1); // Solo enero → mes actual

    return NextResponse.json(
      {
        year, startDate, endDate,
        resumen: {
          ingresos, costoVentas, resultadoBruto,
          gastosOperativos, depreciaciones, resultadoNeto,
          margenBruto: ingresos > 0 ? (resultadoBruto / ingresos) * 100 : 0,
          margenNeto:  ingresos > 0 ? (resultadoNeto  / ingresos) * 100 : 0,
        },
        cuentas,
        mensual,
      },
      { headers: { 'Cache-Control': 'private, max-age=1800' } }
    );

  } catch (err) {
    console.error('[Odoo PnL]', err.message);
    return NextResponse.json({ error: err.message ?? 'Error Odoo P&L' }, { status: 502 });
  }
}
