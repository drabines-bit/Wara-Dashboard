import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getDashboardData, getDashboardConfig } from "@/lib/kv";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import ScrollToTop from "@/components/ScrollToTop";
import BacktestClient from "@/components/proyeccion/backtest/BacktestClient";

export default async function BacktestPage() {
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Backtesting</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Real vs. lo que el modelo había proyectado en su momento vs. la proyección manual del CFO.
            </p>
          </div>
          <Link href="/proyeccion" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
            ← Volver a Proyección
          </Link>
        </div>
        <BacktestClient />
      </main>
      <DashboardFooter links={config?.links} />
      <ScrollToTop />
    </div>
  );
}
