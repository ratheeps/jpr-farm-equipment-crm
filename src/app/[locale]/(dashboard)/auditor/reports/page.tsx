import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  getFuelEfficiencyReport,
  getEngineHoursSummary,
  getMaintenanceStatusReport,
} from "@/lib/actions/reports";
import { AlertTriangle, CheckCircle } from "lucide-react";

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

  const [fuelRows, hoursRows, maintenanceRows] = await Promise.all([
    getFuelEfficiencyReport(),
    getEngineHoursSummary(),
    getMaintenanceStatusReport(),
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
      </div>
    </div>
  );
}
