import { NextResponse }     from 'next/server';
import { getServerSession } from 'next-auth';
import { getDashboardConfig, setDashboardConfig, getAutoSyncStatus } from '@/lib/kv';

const QSTASH_BASE = process.env.QSTASH_URL ?? 'https://qstash.upstash.io';
const QSTASH = `${QSTASH_BASE}/v2`;

const CRON_MAP = {
  1:  '0 * * * *',
  2:  '0 */2 * * *',
  4:  '0 */4 * * *',
  6:  '0 */6 * * *',
  12: '0 */12 * * *',
  24: '0 0 * * *',
  48: '0 0 */2 * *',
};

async function checkAdmin(session) {
  const emails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim());
  return !!session?.user?.email && emails.includes(session.user.email);
}

// GET — estado actual
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const [cfg, status] = await Promise.all([getDashboardConfig(), getAutoSyncStatus()]);
  return NextResponse.json({ autoSync: cfg.autoSync ?? {}, lastStatus: status });
}

// POST — activar / cambiar intervalo
export async function POST(req) {
  const session = await getServerSession();
  if (!session || !(await checkAdmin(session)))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { intervalHours } = await req.json();
  const cron = CRON_MAP[intervalHours];
  if (!cron) return NextResponse.json({ error: 'Intervalo inválido' }, { status: 400 });

  const appUrl = process.env.APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!appUrl)
    return NextResponse.json({ error: 'APP_URL no configurada en Vercel' }, { status: 500 });

  const config = await getDashboardConfig();

  // Eliminar schedule anterior si existe
  if (config.autoSync?.scheduleId) {
    await fetch(`${QSTASH}/schedules/${config.autoSync.scheduleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` },
    }).catch(() => {});
  }

  // Crear nuevo schedule
  const qRes = await fetch(`${QSTASH}/schedules`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${process.env.QSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destination: `${appUrl}/api/sync-sheets`,
      cron,
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ _autoSync: true }),
    }),
  });

  if (!qRes.ok) {
    const err = await qRes.text();
    return NextResponse.json({ error: `QStash: ${err}` }, { status: 502 });
  }

  const { scheduleId } = await qRes.json();

  await setDashboardConfig({
    ...config,
    autoSync: {
      enabled:       true,
      intervalHours,
      scheduleId,
      activatedAt:   new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true, scheduleId });
}

// DELETE — desactivar
export async function DELETE() {
  const session = await getServerSession();
  if (!session || !(await checkAdmin(session)))
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const config = await getDashboardConfig();
  if (config.autoSync?.scheduleId) {
    await fetch(`${QSTASH}/schedules/${config.autoSync.scheduleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` },
    }).catch(() => {});
  }

  await setDashboardConfig({
    ...config,
    autoSync: {
      ...config.autoSync,
      enabled:    false,
      scheduleId: null,
    },
  });

  return NextResponse.json({ ok: true });
}
