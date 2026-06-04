import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDashboardData, getDashboardConfig, getLastSync } from "@/lib/kv";
import DashboardClient from "@/components/DashboardClient";
import WelcomeBanner from "@/components/WelcomeBanner";
import WelcomeVideoModal from "@/components/WelcomeVideoModal";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [data, config, lastSync] = await Promise.all([
    getDashboardData(),
    getDashboardConfig(),
    getLastSync(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <WelcomeVideoModal userName={session.user.name} />
      <DashboardHeader
        user={session.user}
        isAdmin={session.user.role === "admin"}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WelcomeBanner
          userName={session.user.name}
          lastSync={lastSync}
        />
        <DashboardClient
          initialData={data}
          config={config}
          isAdmin={session.user.role === "admin"}
        />
      </main>
      <DashboardFooter links={config?.links} />
    </div>
  );
}
