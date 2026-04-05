import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  getFuelEfficiencyReport,
  getEngineHoursSummary,
  getMaintenanceStatusReport,
  getIdlingReport,
  getFuelDiscrepancyReport,
  getProjectMarginReport,
} from "@/lib/actions/reports";
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp } from "lucide-react";

export default async function AuditorReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin", "auditor"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const t = await getTranslations("reports");

  const [fuelRows, hoursRows, maintenanceRows, idlingRows, discrepancyRows, marginRows] = await Promise.all([
    getFuelEfficiencyReport(),
    getEngineHoursSummary(),
    getMaintenanceStatusReport(),
    getIdlingReport(),
    getFuelDiscrepancyReport(),
    getProjectMarginReport(),
  ]);

  function varianceColor(variance: number | null) {
    if (variance === null) return "text-muted-foreground";
    if (variance > 25) return "text-destructive font-semibold";
    if (variance > 10) return "text-orange-600 font-semibold";
    return "text-green-600";
  }

  return (
    <div>
      <Topbar title={t("title")} showBack />
      <div className="px-4 py-4 space-y-5">

        {/* Fuel Efficiency */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">
            {t("fuelEfficiency")}
          </h2>
          {fuelRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("noData")}
            </p>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-5 gap-1 px-3 py-2 bg-muted/50">
                <p className="text-[10px] font-medium text-muted-foreground col-span-2">
                  {t("vehicle")}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground text-right">
                  {t("totalHours")}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground text-right">
                  {t("actualLPerHr")}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground text-right">
                  {t("variance")}
                </p>
              </div>
              {fuelRows.map((row, i) => (
                <div
                  key={row.vehicleId}
                  className={`grid grid-cols-5 gap-1 px-3 py-2.5 ${
                    i < fuelRows.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <p className="text-sm text-foreground truncate col-span-2">
                    {row.vehicleName}
                  </p>
                  <p className="text-sm text-foreground text-right">
                    {row.totalEngineHours.toLocaleString()}
                  </p>
                  <p className="text-sm text-foreground text-right">
                    {row.actualLPerHr !== null ? row.actualLPerHr : "—"}
                  </p>
                  <p
                    className={`text-sm text-right ${varianceColor(row.variancePct)}`}
                  >
                    {row.variancePct !== null
                      ? `${row.variancePct > 0 ? "+" : ""}${row.variancePct}%`
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Engine Hours Summary */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">
            {t("engineHours")}
          </h2>
          {hoursRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("noData")}
            </p>
          ) : (
            <div className="space-y-2">
              {hoursRows.map((row) => (
                <div
                  key={row.vehicleId}
                  className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {row.vehicleName}
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {row.totalHours.toLocaleString()} hrs
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Maintenance Status */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">
            {t("maintenanceStatus")}
          </h2>
          {maintenanceRows.length === 0 ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">
                {t("noData") === "No data available"
                  ? "All vehicles up to date"
                  : t("noData")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {maintenanceRows.map((row) => (
                <div
                  key={row.vehicleId}
                  className="bg-red-50 border border-red-200 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-red-800">
                      {row.vehicleName}
                    </p>
                    <div className="flex items-center gap-1 text-xs font-medium text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {row.overdueCount} overdue
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {row.overdueTypes.map((type) => (
                      <span
                        key={type}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium"
                      >
                        {type.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Idling Report */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">
            {t("idlingReport")}
          </h2>
          <p className="text-xs text-muted-foreground mb-3">{t("idlingDescription")}</p>
          {idlingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("noData")}</p>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 gap-1 px-3 py-2 bg-muted/50">
                <p className="text-[10px] font-medium text-muted-foreground col-span-2">{t("vehicle")}</p>
                <p className="text-[10px] font-medium text-muted-foreground text-right">{t("idleRatio")}</p>
                <p className="text-[10px] font-medium text-muted-foreground text-right">{t("idleHours")}</p>
              </div>
              {idlingRows.map((row, i) => (
                <div
                  key={row.vehicleId}
                  className={`grid grid-cols-4 gap-1 px-3 py-2.5 ${i < idlingRows.length - 1 ? "border-b border-border" : ""}`}
                >
                  <p className="text-sm text-foreground truncate col-span-2">{row.vehicleName}</p>
                  <p className={`text-sm text-right font-semibold ${row.idleRatioPct >= 50 ? "text-destructive" : row.idleRatioPct >= 20 ? "text-orange-600" : "text-green-600"}`}>
                    {row.idleRatioPct}%
                  </p>
                  <p className="text-sm text-foreground text-right">{row.nonProductiveEngineHours} hrs</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fuel Discrepancy Report */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">
            {t("fuelDiscrepancy")}
          </h2>
          <p className="text-xs text-muted-foreground mb-3">{t("fuelDiscrepancyDescription")}</p>
          {discrepancyRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("noData")}</p>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-5 gap-1 px-3 py-2 bg-muted/50">
                <p className="text-[10px] font-medium text-muted-foreground col-span-2">{t("vehicle")}</p>
                <p className="text-[10px] font-medium text-muted-foreground text-right">{t("expectedL")}</p>
                <p className="text-[10px] font-medium text-muted-foreground text-right">{t("actualL")}</p>
                <p className="text-[10px] font-medium text-muted-foreground text-right">{t("variance")}</p>
              </div>
              {discrepancyRows.map((row, i) => (
                <div
                  key={row.vehicleId}
                  className={`grid grid-cols-5 gap-1 px-3 py-2.5 ${row.flagged ? "bg-orange-50" : ""} ${i < discrepancyRows.length - 1 ? "border-b border-border" : ""}`}
                >
                  <p className="text-sm text-foreground truncate col-span-2 flex items-center gap-1">
                    {row.flagged && <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />}
                    {row.vehicleName}
                  </p>
                  <p className="text-sm text-foreground text-right">{row.expectedFuelLiters ?? "—"}</p>
                  <p className="text-sm text-foreground text-right">{row.actualFuelLogged}</p>
                  <p className={`text-sm text-right font-semibold ${(row.discrepancyPct ?? 0) > 20 ? "text-destructive" : (row.discrepancyPct ?? 0) < -20 ? "text-orange-600" : "text-green-600"}`}>
                    {row.discrepancyPct !== null ? `${row.discrepancyPct > 0 ? "+" : ""}${row.discrepancyPct}%` : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Margin Report */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">
            {t("projectMargin")}
          </h2>
          <p className="text-xs text-muted-foreground mb-3">{t("projectMarginDescription")}</p>
          {marginRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("noData")}</p>
          ) : (
            <div className="space-y-2">
              {marginRows.map((row) => (
                <div key={row.projectId} className="bg-card border border-border rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{row.projectName}</p>
                      <p className="text-xs text-muted-foreground">{row.clientName}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {row.margin >= 0
                        ? <TrendingUp className="h-4 w-4 text-green-600" />
                        : <TrendingDown className="h-4 w-4 text-destructive" />
                      }
                      <span className={`text-sm font-bold ${row.margin >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {row.marginPct !== null ? `${row.marginPct > 0 ? "+" : ""}${row.marginPct}%` : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-2 text-xs text-muted-foreground mt-2">
                    <span>Revenue: <span className="font-medium text-foreground">Rs {row.revenue.toLocaleString()}</span></span>
                    <span>Cost: <span className="font-medium text-foreground">Rs {row.totalCost.toLocaleString()}</span></span>
                    <span>Margin: <span className={`font-medium ${row.margin >= 0 ? "text-green-600" : "text-destructive"}`}>Rs {row.margin.toLocaleString()}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
