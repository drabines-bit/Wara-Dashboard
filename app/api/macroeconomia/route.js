import { NextResponse }    from 'next/server';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const hoy    = new Date();
  const hace90 = new Date(hoy.getTime() - 90 * 24 * 60 * 60 * 1000);
  const desde  = hace90.toISOString().split('T')[0];
  const hasta  = hoy.toISOString().split('T')[0];

  const [inflResult, bcraResult] = await Promise.allSettled([
    fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion', {
      next: { revalidate: 21600 },
      headers: { 'Accept': 'application/json' },
    }),
    fetch(`https://api.bcra.gob.ar/estadisticas/v2.0/datosVariable/6/${desde}/${hasta}`, {
      next: { revalidate: 21600 },
      headers: { 'Accept': 'application/json' },
    }),
  ]);

  // ── Inflación ──────────────────────────────────────────────────────────
  let inflacion = null;
  if (inflResult.status === 'fulfilled' && inflResult.value.ok) {
    try {
      const serie = await inflResult.value.json(); // [{ fecha, valor }, ...]
      const anio  = hoy.getFullYear();
      const enAño = serie.filter(d => d.fecha?.startsWith(String(anio)));

      if (enAño.length > 0) {
        const ultimo = enAño[enAño.length - 1];
        const penult = enAño[enAño.length - 2];

        const ytd = enAño.reduce((acc, d) => acc * (1 + (d.valor ?? 0) / 100), 1);

        const [y, m] = ultimo.fecha.split('-');
        const mesLabel = new Date(parseInt(y), parseInt(m) - 1, 1)
          .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

        inflacion = {
          mensual:   ultimo.valor,
          mesLabel:  mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
          ytd:       parseFloat(((ytd - 1) * 100).toFixed(2)),
          tendencia: penult
            ? (ultimo.valor > penult.valor ? 'sube'
              : ultimo.valor < penult.valor ? 'baja' : 'estable')
            : null,
          serie: enAño.slice(-6).map(d => ({
            mes:   d.fecha?.slice(0, 7),
            valor: d.valor,
          })),
        };
      }
    } catch { /* silencioso */ }
  }

  // ── Tasa BCRA ─────────────────────────────────────────────────────────
  let bcra = null;
  if (bcraResult.status === 'fulfilled' && bcraResult.value.ok) {
    try {
      const data    = await bcraResult.value.json();
      const results = data?.results ?? [];
      if (results.length > 0) {
        const last = results[results.length - 1];
        const tna  = last.v ?? 0;
        const tem  = (Math.pow(1 + tna / 100 / 365, 30) - 1) * 100;
        bcra = {
          tna:   tna,
          tem:   parseFloat(tem.toFixed(2)),
          fecha: last.d ?? null,
        };
      }
    } catch { /* silencioso */ }
  }

  return NextResponse.json({ inflacion, bcra }, {
    headers: { 'Cache-Control': 'private, max-age=21600' },
  });
}
