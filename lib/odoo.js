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

let uidCache = null;

export async function getUid() {
  if (uidCache) return uidCache;
  const uid = await jsonrpc('common', 'authenticate', [ODOO_DB, ODOO_EMAIL, ODOO_KEY, {}]);
  if (!uid) throw new Error('Autenticación fallida — verificá las credenciales de Odoo');
  uidCache = uid;
  return uid;
}

export async function executeKw(model, method, args, kwargs = {}) {
  const uid = await getUid();
  return jsonrpc('object', 'execute_kw', [ODOO_DB, uid, ODOO_KEY, model, method, args, kwargs]);
}

export async function searchRead(model, domain, fields, limit = 1000, order = '') {
  return executeKw(model, 'search_read', [domain], { fields, limit, ...(order ? { order } : {}) });
}
