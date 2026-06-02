import ImportPanel from "@/components/admin/ImportPanel";
import SyncSheetsPanel from "@/components/admin/SyncSheetsPanel";

export default function ImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Importar datos
      </h1>
      <p className="text-slate-500 mb-8">
        Sincronizá directamente desde Google Sheets o subí el archivo Excel manualmente.
      </p>
      <SyncSheetsPanel />
      <ImportPanel />
    </div>
  );
}
