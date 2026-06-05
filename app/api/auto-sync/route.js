import { NextResponse }     from 'next/server';
import { getServerSession } from 'next-auth';
import { Client, Receiver } from '@upstash/qstash';
import { getDashboardConfig, setDashboardConfig, getAutoSyncStatus } from '@/lib/kv';

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

  const { intervalHours, appUrl } = await req.json();

  if (!appUrl?.startsWith('https://'))
    return NextResponse.json(
      { error: `URL inválida: "${appUrl}". Debe empezar con https://` },
      { status: 400 }
    );

  const cron = CRON_MAP[intervalHours];
  if (!cron) return NextResponse.json({ error: 'Intervalo inválido' }, { status: 400 });

  const config = await getDashboardConfig();

  const qClient = new Client({
    token:   process.env.QSTASH_TOKEN ?? '',
    baseUrl: process.env.QSTASH_URL   ?? undefined,
  });

  // Eliminar schedule anterior si existe
  if (config.autoSync?.scheduleId) {
    await qClient.schedules.delete(config.autoSync.scheduleId).catch(() => {});
  }

  // Crear nuevo schedule con el SDK (maneja el formato v2 correctamente)
  const schedule = await qClient.schedules.create({
    destination: `${appUrl}/api/sync-sheets`,
    cron,
    body:    JSON.stringify({ _autoSync: true }),
    headers: { 'content-type': 'application/json' },
    method:  'POST',
  });

  const scheduleId = schedule.scheduleId;

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
  const scheduleId = config.autoSync?.scheduleId;
  if (scheduleId) {
    const qClient = new Client({
      token:   process.env.QSTASH_TOKEN ?? '',
      baseUrl: process.env.QSTASH_URL   ?? undefined,
    });
    await qClient.schedules.delete(scheduleId).catch(() => {});
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
