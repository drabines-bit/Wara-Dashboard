import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDashboardData, getDashboardConfig, getLastSync, getNotas } from "@/lib/kv";
import DashboardClient from "@/components/DashboardClient";
import WelcomeBanner from "@/components/WelcomeBanner";
import MacroContextStrip from "@/components/MacroContextStrip";
import WelcomeVideoModal from "@/components/WelcomeVideoModal";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const year = new Date().getFullYear();

  const [data, config, lastSync, notas] = await Promise.all([
    getDashboardData(),
    getDashboardConfig(),
    getLastSync(),
    getNotas(year),
  ]);

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim());
  const isAdmin = adminEmails.includes(session.user?.email ?? '');

  const defaultMonthIdx = (() => {
    const real = data?.facturacion?.real ?? [];
    let last = 0;
    for (let i = 0; i < 12; i++) { if (real[i] !== null && real[i] !== undefined) last = i; }
    return last;
  })();

  return (
    <div className="min-h-screen bg-slate-50 dashboard-bg">
      <WelcomeVideoModal userName={session.user.name} />
      <DashboardHeader
        user={session.user}
        isAdmin={session.user.role === "admin"}
        companyData={data}
        selectedMonthIdx={defaultMonthIdx}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WelcomeBanner
          userName={session.user.name}
          lastSync={lastSync}
        />
        <MacroContextStrip />
        <DashboardClient
          initialData={data}
          config={config}
          isAdmin={isAdmin}
          initialNotas={notas}
          year={year}
          lastSync={lastSync}
        />
      </main>
      <DashboardFooter links={config?.links} />
    </div>
  );
}
