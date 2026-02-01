import { DashboardHeader } from "@/components/dashboard/header";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ActionableTable } from "@/components/dashboard/actionable-table";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { getAgencyStats } from "@/app/actions/dashboard";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const dashboardData = await getAgencyStats();

  if (!dashboardData) {
    redirect("/onboarding");
  }

  const { agency, profile, stats, locationsNeedingAttention, recentActivity } = dashboardData;

  return (
    <div className="flex flex-col">
      <DashboardHeader
        title={`Bentornato, ${profile.full_name}`}
        description={agency.name}
      />

      <div className="flex-1 space-y-6 p-6">
        {/* KPI Cards */}
        <KpiCards stats={stats} />

        {/* Main Grid: Actionable Table + Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Actionable Table (2/3 width) */}
          <div className="lg:col-span-2">
            <ActionableTable locations={locationsNeedingAttention} />
          </div>

          {/* Recent Activity (1/3 width) */}
          <div className="lg:col-span-1">
            <RecentActivity activities={recentActivity} />
          </div>
        </div>
      </div>
    </div>
  );
}
