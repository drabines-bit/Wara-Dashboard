import ConfigEditor from "@/components/admin/ConfigEditor";
import LinksEditor from "@/components/admin/LinksEditor";
import CustomVariablesEditor from "@/components/admin/CustomVariablesEditor";
import { getDashboardConfig } from "@/lib/kv";

export default async function ConfigPage() {
  const config = await getDashboardConfig();
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Configuración del Dashboard
      </h1>
      <p className="text-slate-500 mb-8">
        Los cambios se aplican al dashboard inmediatamente después de guardar.
      </p>
      <ConfigEditor initialConfig={config} />
      <div className="mt-6">
        <LinksEditor initialLinks={config.links} />
      </div>
      <div className="mt-6">
        <CustomVariablesEditor initialVariables={config.customVariables ?? []} />
      </div>
    </div>
  );
}
