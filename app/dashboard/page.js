import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDashboardData, getDashboardConfig } from "@/lib/kv";
import DashboardClient from "@/components/DashboardClient";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [data, config] = await Promise.all([
    getDashboardData(),
    getDashboardConfig(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader
        user={session.user}
        isAdmin={session.user.role === "admin"}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
