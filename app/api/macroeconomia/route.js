import { NextResponse }    from 'next/server';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';

// BADLAR bancos privados — variable 7, BCRA API v2
async function fetchBadlar() {
  try {
    const arNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const hasta = arNow.toISOString().split('T')[0];
    const desde = new Date(arNow.getTime() - 10 * 24 * 60 * 60 * 1000)
                    .toISOString().split('T')[0];
    const res = await fetch(
      `https://api.bcra.gob.ar/estadisticas/v2.0/datosvariable/7/${desde}/${hasta}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const rows = json?.results ?? [];
    if (rows.length === 0) return null;
    const tna   = rows[rows.length - 1].valor;          // último dato disponible
    const tem   = (Math.pow(1 + tna / 100 / 365, 30) - 1) * 100;
    const fecha = rows[rows.length - 1].fecha;
    return { tna, tem: parseFloat(tem.toFixed(2)), fecha };
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const hoy = new Date();

  const [inflResponse, badlar] = await Promise.all([
    fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion', {
      next: { revalidate: 21600 },
      headers: { 'Accept': 'application/json' },
    }).catch(() => null),
    fetchBadlar(),
  ]);

  // ── Inflación ──────────────────────────────────────────────────────────
  let inflacion = null;
  if (inflResponse?.ok) {
    try {
      const serie = await inflResponse.json(); // [{ fecha, valor }, ...]
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

  return NextResponse.json({ inflacion, badlar }, {
    headers: { 'Cache-Control': 'private, max-age=21600' },
  });
}
