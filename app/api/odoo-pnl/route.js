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
const ALL_PNL      = [...INCOME_TYPES, ...COGS_TYPES, ...OPEX_TYPES, ...DEPR_TYPES];

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

    const year = new Date().getFullYear();

    const lines = await jsonrpc('object', 'execute_kw', [
      ODOO_DB, uid, ODOO_KEY,
      'account.move.line', 'search_read',
      [[
        ['account_id.account_type', 'in', ALL_PNL],
        ['move_id.state', '=', 'posted'],
        ['date', '>=', `${year}-01-01`],
        ['date', '<=', `${year}-12-31`],
      ]],
      { fields: ['account_id', 'date', 'debit', 'credit'], limit: 10000, order: 'date asc' },
    ]);

    const accountIds = [...new Set(lines.map(l => l.account_id[0]))];
    const accounts = accountIds.length > 0
      ? await jsonrpc('object', 'execute_kw', [
          ODOO_DB, uid, ODOO_KEY,
          'account.account', 'search_read',
          [[['id', 'in', accountIds]]],
          { fields: ['id', 'name', 'code', 'account_type'], limit: accountIds.length + 10 },
        ])
      : [];

    const accountMap = {};
    accounts.forEach(a => { accountMap[a.id] = a; });

    const totalesPorCuenta = {};
    lines.forEach(line => {
      const id = line.account_id[0];
      if (!totalesPorCuenta[id]) totalesPorCuenta[id] = { debit: 0, credit: 0 };
      totalesPorCuenta[id].debit  += line.debit  ?? 0;
      totalesPorCuenta[id].credit += line.credit ?? 0;
    });

    const cuentas = Object.entries(totalesPorCuenta).map(([id, bal]) => {
      const acc = accountMap[parseInt(id)];
      if (!acc) return null;
      const tipo  = acc.account_type;
      const monto = INCOME_TYPES.includes(tipo)
        ? bal.credit - bal.debit
        : bal.debit  - bal.credit;
      return { id: parseInt(id), codigo: acc.code, nombre: acc.name, tipo, monto };
    }).filter(Boolean).sort((a, b) => a.codigo.localeCompare(b.codigo));

    const sumPor = (tipos) => cuentas
      .filter(c => tipos.includes(c.tipo))
      .reduce((s, c) => s + c.monto, 0);

    const ingresos         = sumPor(INCOME_TYPES);
    const costoVentas      = sumPor(COGS_TYPES);
    const gastosOperativos = sumPor(OPEX_TYPES);
    const depreciaciones   = sumPor(DEPR_TYPES);
    const resultadoBruto   = ingresos - costoVentas;
    const resultadoNeto    = resultadoBruto - gastosOperativos - depreciaciones;

    const meses = Array.from({ length: 12 }, (_, i) => ({
      mes:    i + 1,
      nombre: new Date(year, i, 1).toLocaleString('es-AR', {
        month: 'short', timeZone: 'America/Argentina/Buenos_Aires',
      }),
      ingresos: 0, costoVentas: 0, gastosOperativos: 0, depreciaciones: 0,
    }));

    lines.forEach(line => {
      const acc = accountMap[line.account_id[0]];
      if (!acc || !line.date) return;
      const idx  = parseInt(line.date.substring(5, 7)) - 1;
      const tipo = acc.account_type;
      const monto = INCOME_TYPES.includes(tipo)
        ? line.credit - line.debit
        : line.debit  - line.credit;

      if (INCOME_TYPES.includes(tipo))        meses[idx].ingresos          += monto;
      else if (COGS_TYPES.includes(tipo))     meses[idx].costoVentas       += monto;
      else if (OPEX_TYPES.includes(tipo))     meses[idx].gastosOperativos  += monto;
      else if (DEPR_TYPES.includes(tipo))     meses[idx].depreciaciones    += monto;
    });

    const mesActual = new Date().getMonth(); // 0 = enero
    const mensual   = meses.slice(0, mesActual + 1);

    return NextResponse.json(
      {
        year,
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
