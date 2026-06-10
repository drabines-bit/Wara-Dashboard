// Score Global del mes — suma ponderada de 6 indicadores normalizados
const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, v));

export function calcularScoreGlobal({ data, mIdx, dso = null, margenNeto = null }) {
  if (!data?.months?.[mIdx]) return null;

  const indicadores = [];

  // 1. Cumplimiento cobranza (peso 25)
  const cumplCob = data.cobranza?.cumplimiento?.[mIdx];
  if (cumplCob != null)
    indicadores.push({
      id: 'cobranza', label: 'Cumpl. Cobranza',
      peso: 25, score: clamp(cumplCob),
      valor: `${cumplCob.toFixed(1)}%`,
    });

  // 2. Cumplimiento facturación (peso 25)
  const cumplFac = data.facturacion?.cumplimiento?.[mIdx];
  if (cumplFac != null)
    indicadores.push({
      id: 'facturacion', label: 'Cumpl. Facturación',
      peso: 25, score: clamp(cumplFac),
      valor: `${cumplFac.toFixed(1)}%`,
    });

  // 3. Liquidez corriente (peso 15): 2x = 100, 1x = 50
  const ac = data.activoCorriente?.total?.[mIdx];
  const pc = data.pasivoCorriente?.total?.[mIdx];
  if (ac != null && pc > 0) {
    const ratio = ac / pc;
    indicadores.push({
      id: 'liquidez', label: 'Liquidez',
      peso: 15, score: clamp((ratio / 2) * 100),
      valor: `${ratio.toFixed(1)}x`,
    });
  }

  // 4. DSO (peso 15): 30 días = 100, 90 días = 0
  if (dso != null)
    indicadores.push({
      id: 'dso', label: 'DSO',
      peso: 15, score: clamp(((90 - dso) / 60) * 100),
      valor: `${dso} días`,
    });

  // 5. Variación m/m facturación (peso 10): +10% = 100, 0 = 50, -10% = 0
  const varMM = data.facturacion?.variacion?.[mIdx];
  if (varMM != null)
    indicadores.push({
      id: 'variacion', label: 'Variación m/m',
      peso: 10, score: clamp(50 + varMM * 5),
      valor: `${varMM > 0 ? '+' : ''}${varMM.toFixed(1)}%`,
    });

  // 6. Margen neto Odoo (peso 10): 20% = 100, 0 = 0
  if (margenNeto != null)
    indicadores.push({
      id: 'margen', label: 'Margen neto',
      peso: 10, score: clamp(margenNeto * 5),
      valor: `${margenNeto.toFixed(1)}%`,
    });

  if (indicadores.length === 0) return null;

  // Re-ponderar según los indicadores disponibles
  const pesoTotal = indicadores.reduce((s, i) => s + i.peso, 0);
  const score = Math.round(
    indicadores.reduce((s, i) => s + (i.score * i.peso) / pesoTotal, 0)
  );

  const nivel = score >= 75 ? 'verde' : score >= 50 ? 'amarillo' : 'rojo';

  return { score, nivel, indicadores };
}
