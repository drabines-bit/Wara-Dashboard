"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TablaProyeccion from "@/components/proyeccion/TablaProyeccion";
import GraficoProyeccion from "@/components/proyeccion/GraficoProyeccion";
import PanelSupuestos from "@/components/proyeccion/PanelSupuestos";
import ExportProyeccion from "@/components/proyeccion/ExportProyeccion";

export default function ProyeccionClient({ isAdmin }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const chartCanvasRef = useRef(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/proyeccion", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando && !data) {
    return <p className="text-sm text-slate-400 py-12 text-center">Calculando proyección…</p>;
  }

  if (error && !data) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-xl px-4 py-3">
        {error}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {isAdmin && (
        <ExportProyeccion
          detalle={data?.detalle}
          subtotalesAnuales={data?.subtotalesAnuales}
          chartCanvasRef={chartCanvasRef}
        />
      )}
      <GraficoProyeccion detalle={data?.detalle} canvasRef={chartCanvasRef} />
      <TablaProyeccion detalle={data?.detalle} subtotalesAnuales={data?.subtotalesAnuales} />
      {isAdmin && <PanelSupuestos onRecalcular={cargar} />}
    </div>
  );
}
