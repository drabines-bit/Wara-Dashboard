import SyncSheetsPanel from "@/components/admin/SyncSheetsPanel";
import AutoSyncPanel from "@/components/admin/AutoSyncPanel";

export default function ImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Sincronización
      </h1>
      <p className="text-slate-500 mb-8">
        Sincronizá directamente desde Google Sheets.
      </p>
      <AutoSyncPanel />
      <SyncSheetsPanel />
    </div>
  );
}
