import { getSnapshot } from "@/lib/proyeccion/snapshots";
import { getCfoTodos } from "@/lib/proyeccion/cfo";
import { realFacturacionMes, realCobranzaMes, realResultadoMes } from "@/lib/proyeccion/actuals";
import { mesCerradoActual } from "@/lib/proyeccion/ventas";
import { sumarMeses } from "@/lib/proyeccion/fechas";

const MESES_A_REVISAR = 24; // ventana hacia atrás para buscar meses con snapshot/CFO

function construirLinea(real, modelo, cfo) {
  const hay = (v) => v !== null && v !== undefined;
  const desvio = (proyectado) => {
    if (!hay(real) || !hay(proyectado)) return { abs: null, pct: null };
    const abs = real - proyectado;
    return { abs, pct: real !== 0 ? abs / real : null };
  };
  const dModelo = desvio(modelo);
  const dCfo = desvio(cfo);
  return {
    real: hay(real) ? real : null,
    modelo: hay(modelo) ? modelo : null,
    cfo: hay(cfo) ? cfo : null,
    desvioModeloAbs: dModelo.abs,
    desvioModeloPct: dModelo.pct,
    desvioCfoAbs: dCfo.abs,
    desvioCfoPct: dCfo.pct,
  };
}

function promedio(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

const LINEAS = ["facturacion", "cobranza", "resultado"];

function calcularAgregados(filas) {
  const agregados = {};
  for (const linea of LINEAS) {
    const modeloPct = filas.map((f) => f.lineas[linea].desvioModeloPct).filter((v) => v !== null);
    const cfoPct = filas.map((f) => f.lineas[linea].desvioCfoPct).filter((v) => v !== null);
    agregados[linea] = {
      nModelo: modeloPct.length,
      nCfo: cfoPct.length,
      mapeModelo: promedio(modeloPct.map(Math.abs)),
      mapeCfo: promedio(cfoPct.map(Math.abs)),
      sesgoModelo: promedio(modeloPct),
      sesgoCfo: promedio(cfoPct),
    };
  }
  return agregados;
}

// CAMBIO 3 — Compara, para cada mes cerrado M, lo que el modelo había
// proyectado hace L meses (snapshot vintage) contra lo realmente sucedido y
// contra la proyección manual del CFO para ese mes.
export async function backtest(L = 3) {
  const ultimoCerrado = mesCerradoActual();
  const cfoTodos = await getCfoTodos();

  // Paso barato: identificar qué meses tienen algo para comparar (snapshot
  // vintage o entrada del CFO) antes de pagar el costo de traer los actuals de Odoo.
  const candidatos = [];
  for (let i = 0; i < MESES_A_REVISAR; i++) {
    const mes = sumarMeses(ultimoCerrado, -i);
    const vintage = sumarMeses(mes, -L);
    const snapshot = await getSnapshot(vintage);
    const modeloFila = snapshot?.horizonte?.find((h) => h.mes === mes) ?? null;
    const cfoFila = cfoTodos[mes] ?? null;
    if (!modeloFila && !cfoFila) continue;
    candidatos.push({ mes, modeloFila, cfoFila });
  }
  candidatos.reverse(); // orden cronológico ascendente

  const filas = await Promise.all(candidatos.map(async ({ mes, modeloFila, cfoFila }) => {
    const [realFacturacion, realCobranza, realResultado] = await Promise.all([
      realFacturacionMes(mes), realCobranzaMes(mes), realResultadoMes(mes),
    ]);
    return {
      mes,
      vintage: sumarMeses(mes, -L),
      lineas: {
        facturacion: construirLinea(realFacturacion, modeloFila?.facturacionNeta, cfoFila?.facturacion),
        cobranza:    construirLinea(realCobranza, modeloFila?.cobranza, cfoFila?.cobranzas),
        resultado:   construirLinea(realResultado, modeloFila?.resultado, cfoFila?.resultado),
      },
    };
  }));

  return { L, filas, agregados: calcularAgregados(filas) };
}
