import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { db } from "@/db";
import { vehicles, projects, loans, receivables, paddyFarms, maintenanceSchedules } from "@/db/schema";
import { eq, count, sum, and } from "drizzle-orm";
import Link from "next/link";
import {
  getFleetPositions,
  getAssetProfitability,
  getAllFarmROI,
  getExpenseAlerts,
} from "@/lib/actions/reports";
import { ExpenseAlerts } from "@/components/dashboard/expense-alerts";
import { ProfitabilityChart } from "@/components/dashboard/profitability-chart";
import { FarmROIChart } from "@/components/dashboard/farm-roi-chart";
import { FleetMapClient } from "@/components/dashboard/fleet-map-client";

export default async function OwnerDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tCommon = await getTranslations("common");
  const tFinance = await getTranslations("finance");
  const tVehicles = await getTranslations("vehicles");
  const tProjects = await getTranslations("projects");
  const tFarms = await getTranslations("farms");
  const tMaintenance = await getTranslations("maintenance");

  const [
    activeVehiclesResult,
    activeProjectsResult,
    totalDebtResult,
    totalReceivablesResult,
    activeFarmsResult,
    overdueMaintenanceResult,
    fleetPositions,
    assetProfitability,
    farmROI,
    expenseAlerts,
  ] = await Promise.all([
    db.select({ count: count() }).from(vehicles).where(eq(vehicles.status, "active")),
    db.select({ count: count() }).from(projects).where(eq(projects.status, "active")),
    db.select({ total: sum(loans.outstandingBalance) }).from(loans).where(eq(loans.status, "active")),
    db.select({ total: sum(receivables.outstandingBalance) }).from(receivables).where(and(eq(receivables.status, "pending"))),
    db.select({ count: count() }).from(paddyFarms).where(eq(paddyFarms.isActive, true)),
    db.select({ count: count() }).from(maintenanceSchedules).where(eq(maintenanceSchedules.isOverdue, true)),
    getFleetPositions(),
    getAssetProfitability(),
    getAllFarmROI(),
    getExpenseAlerts(),
  ]);

  const activeVehicles = activeVehiclesResult[0]?.count ?? 0;
  const activeProjects = activeProjectsResult[0]?.count ?? 0;
  const totalDebt = Number(totalDebtResult[0]?.total ?? 0);
  const totalReceivables = Number(totalReceivablesResult[0]?.total ?? 0);
  const activeFarms = activeFarmsResult[0]?.count ?? 0;
  const overdueMaintenanceCount = overdueMaintenanceResult[0]?.count ?? 0;

  return (
    <div>
      <Topbar title="JPR Management" />
      <div className="px-4 py-4 space-y-4">
        {/* Summary cards row */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/${locale}/admin/vehicles`}>
            <StatCard
              label={tVehicles("title")}
              value={String(activeVehicles)}
              subtitle={tCommon("active")}
              color="green"
            />
          </Link>
          <StatCard
            label={tProjects("title")}
            value={String(activeProjects)}
            subtitle={tCommon("active")}
            color="blue"
          />
          <Link href={`/${locale}/admin/farms`}>
            <StatCard
              label={tFarms("title")}
              value={String(activeFarms)}
              subtitle={tCommon("active")}
              color="yellow"
            />
          </Link>
          <Link href={`/${locale}/admin/maintenance`}>
            <StatCard
              label={tMaintenance("title")}
              value={String(overdueMaintenanceCount)}
              subtitle={overdueMaintenanceCount > 0 ? tMaintenance("overdue") : tMaintenance("allClear")}
              color={overdueMaintenanceCount > 0 ? "red" : "green"}
            />
          </Link>
        </div>

        {/* Financial summary */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="font-semibold text-foreground text-sm">
            {tFinance("title")}
          </p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {tFinance("totalDebt")}
            </span>
            <span className="font-bold text-destructive">
              Rs. {totalDebt.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {tFinance("receivables")}
            </span>
            <span className="font-bold text-green-600">
              Rs. {totalReceivables.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-border pt-2">
            <span className="text-sm font-medium text-foreground">
              {tFinance("netWorth")}
            </span>
            <span
              className={`font-bold ${
                totalReceivables - totalDebt >= 0
                  ? "text-green-600"
                  : "text-destructive"
              }`}
            >
              Rs. {(totalReceivables - totalDebt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Expense Alerts */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Alerts</h2>
          <ExpenseAlerts alerts={expenseAlerts} />
        </div>

        {/* Fleet Status Map */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Fleet Positions</h2>
          <FleetMapClient positions={fleetPositions} />
        </div>

        {/* Asset Profitability */}
        {assetProfitability.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">Asset Costs</h2>
            <p className="text-xs text-muted-foreground mb-3">Total recorded expenses per vehicle</p>
            <div className="bg-card border border-border rounded-xl p-3">
              <ProfitabilityChart data={assetProfitability} />
            </div>
          </div>
        )}

        {/* Farm ROI */}
        {farmROI.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">Farm ROI</h2>
            <p className="text-xs text-muted-foreground mb-3">Return on investment per active farm</p>
            <div className="bg-card border border-border rounded-xl p-3">
              <FarmROIChart data={farmROI} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  subtitle: string;
  color: "green" | "blue" | "yellow" | "red";
}) {
  const colors = {
    green: "bg-green-50 border-green-200",
    blue: "bg-blue-50 border-blue-200",
    yellow: "bg-yellow-50 border-yellow-200",
    red: "bg-red-50 border-red-200",
  };
  const valueColors = {
    green: "text-green-700",
    blue: "text-blue-700",
    yellow: "text-yellow-700",
    red: "text-red-700",
  };

  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueColors[color]}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}
