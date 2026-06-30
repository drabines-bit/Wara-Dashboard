import { facturacionNeta, mesCerradoActual } from "@/lib/proyeccion/ventas";
import { cobranzaProyectada } from "@/lib/proyeccion/cobranzas";
import { proyectarCostos } from "@/lib/proyeccion/costos";

const TIPO_A_BUCKET = { fijo: "fijos", var_unidades: "variables", pct_facturacion: "iibb" };

function esCierreFiscal(mes) {
  return mes.endsWith("-12");
}

// Combina ventas + cobranzas + costos en una sola grilla de N meses con dos
// lentes (devengado y caja). IVA/Ganancias no se estiman: "impuestos" queda
// expuesto en null a propósito. Usado tanto por el GET de la página como por
// el cron de email, para no duplicar la lógica de combinación.
export async function obtenerProyeccionCompleta(cantidadMeses = 18) {
  const mesCerrado = mesCerradoActual();

  const [ventas, cobranzas, costos] = await Promise.all([
    facturacionNeta(mesCerrado, cantidadMeses),
    cobranzaProyectada(mesCerrado, cantidadMeses),
    proyectarCostos(mesCerrado, cantidadMeses),
  ]);

  const ventasPorMes = new Map(ventas.map((f) => [f.mes, f]));
  const cobranzaPorMes = new Map(cobranzas.detalle.map((c) => [c.mes, c]));

  const detalle = costos.map((c) => {
    const cob = cobranzaPorMes.get(c.mes);
    const v = ventasPorMes.get(c.mes);
    const facturacionNetaMes = v?.facturacionNeta ?? c.facturacionNeta;

    const costosPorTipo = { fijos: 0, variables: 0, iibb: 0 };
    for (const cuenta of c.porCuenta) {
      const bucket = TIPO_A_BUCKET[cuenta.tipo];
      if (bucket) costosPorTipo[bucket] += cuenta.monto;
    }
    const costosTotal = costosPorTipo.fijos + costosPorTipo.variables + costosPorTipo.iibb;
    const egresos = costosTotal; // v1: se asume costo devengado = pago en el mismo mes
    const cobranzaConIva = cob?.cobranzaConIva ?? 0;

    return {
      mes: c.mes,
      esCierreFiscal: esCierreFiscal(c.mes),
      facturacionNeta: Math.round(facturacionNetaMes),
      facturacionMix: {
        abonos: Math.round(v?.abonos ?? 0),
        instalaciones: Math.round(v?.instalaciones ?? 0),
        otros: Math.round(v?.otros ?? 0),
        proyectos: Math.round(v?.proyectos ?? 0),
      },
      cobranzaConIva: Math.round(cobranzaConIva),
      ivaPasante: Math.round(cob?.ivaPasante ?? 0),
      costos: {
        fijos: Math.round(costosPorTipo.fijos),
        variables: Math.round(costosPorTipo.variables),
        iibb: Math.round(costosPorTipo.iibb),
        total: Math.round(costosTotal),
      },
      resultadoDevengado: Math.round(facturacionNetaMes - costosTotal),
      egresos: Math.round(egresos),
      cajaOperativa: Math.round(cobranzaConIva - egresos),
      impuestos: null, // IVA y Ganancias: pendiente, no estimado en v1
    };
  });

  const subtotalesAnuales = [];
  let actual = null;
  for (const fila of detalle) {
    const anio = fila.mes.slice(0, 4);
    if (!actual || actual.anio !== anio) {
      actual = {
        anio, desde: fila.mes, hasta: fila.mes,
        facturacionNeta: 0, cobranzaConIva: 0, costosTotal: 0, resultadoDevengado: 0, cajaOperativa: 0,
      };
      subtotalesAnuales.push(actual);
    }
    actual.hasta = fila.mes;
    actual.facturacionNeta    += fila.facturacionNeta;
    actual.cobranzaConIva     += fila.cobranzaConIva;
    actual.costosTotal        += fila.costos.total;
    actual.resultadoDevengado += fila.resultadoDevengado;
    actual.cajaOperativa      += fila.cajaOperativa;
  }

  return { detalle, subtotalesAnuales, curvaCobranza: cobranzas.curva };
}
