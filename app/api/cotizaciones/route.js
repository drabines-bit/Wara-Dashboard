import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [arResult, clResult] = await Promise.allSettled([
    fetch('https://dolarapi.com/v1/dolares/oficial', {
      next: { revalidate: 600 },
      headers: { 'Accept': 'application/json' },
    }),
    fetch('https://mindicador.cl/api/dolar', {
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/json' },
    }),
  ]);

  let ars = null;
  if (arResult.status === 'fulfilled' && arResult.value.ok) {
    try {
      const data = await arResult.value.json();
      ars = {
        compra:      data.compra,
        venta:       data.venta,
        actualizado: data.fechaActualizacion ?? null,
      };
    } catch { /* silencioso */ }
  }

  let clp = null;
  if (clResult.status === 'fulfilled' && clResult.value.ok) {
    try {
      const data = await clResult.value.json();
      const ultimo = data?.serie?.[0];
      if (ultimo) {
        clp = {
          valor:       ultimo.valor,
          actualizado: ultimo.fecha ?? null,
        };
      }
    } catch { /* silencioso */ }
  }

  return NextResponse.json({ ars, clp }, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
    },
  });
}
