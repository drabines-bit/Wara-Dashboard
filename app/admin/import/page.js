import ImportPanel from "@/components/admin/ImportPanel";

export default function ImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Importar Excel
      </h1>
      <p className="text-slate-500 mb-8">
        Cargá el archivo{" "}
        <code className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-rose-500 text-sm">
          Dashboard Finance - 2026.xlsx
        </code>{" "}
        para actualizar todos los indicadores del dashboard.
      </p>
      <ImportPanel />
    </div>
  );
}
