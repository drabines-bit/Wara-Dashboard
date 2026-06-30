import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDashboardData, getDashboardConfig } from "@/lib/kv";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import ScrollToTop from "@/components/ScrollToTop";
import ProyeccionClient from "@/components/proyeccion/ProyeccionClient";

export default async function ProyeccionPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [data, config] = await Promise.all([
    getDashboardData(),
    getDashboardConfig(),
  ]);

  if (!config?.secciones?.proyeccion) redirect("/dashboard");

  const isAdmin = session.user.role === "admin";

  const defaultMonthIdx = (() => {
    const real = data?.facturacion?.real ?? [];
    let last = 0;
    for (let i = 0; i < 12; i++) { if (real[i] !== null && real[i] !== undefined) last = i; }
    return last;
  })();

  return (
    <div className="min-h-screen bg-slate-50 dashboard-bg">
      <DashboardHeader
        user={session.user}
        isAdmin={isAdmin}
        companyData={data}
        selectedMonthIdx={defaultMonthIdx}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Proyección financiera</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ventas, cobranzas y costos a 18 meses — devengado y caja.</p>
        </div>
        <ProyeccionClient isAdmin={isAdmin} />
      </main>
      <DashboardFooter links={config?.links} />
      <ScrollToTop />
    </div>
  );
}
