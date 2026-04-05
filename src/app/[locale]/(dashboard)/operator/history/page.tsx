import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getLogHistory } from "@/lib/actions/daily-logs";
import { CheckCircle2, Clock, Fuel, Gauge, CheckCheck, RefreshCw } from "lucide-react";

const vehicleTypeIcons: Record<string, string> = {
  excavator: "🏗️",
  bulldozer: "🚧",
  harvester: "🌾",
  transport_truck: "🚛",
  tractor: "🚜",
};

export default async function OperatorHistoryPage() {
  const t = await getTranslations("operator");
  const logs = await getLogHistory(30);

  return (
    <div>
      <Topbar title={t("history")} showBack />
      <div className="px-4 py-6 space-y-3">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("noLogs")}</p>
          </div>
        ) : (
          logs.map((log) => {
            const isComplete = !!log.endEngineHours;
            const startH = parseFloat(log.startEngineHours);
            const endH = log.endEngineHours ? parseFloat(log.endEngineHours) : null;
            const worked = endH !== null ? (endH - startH).toFixed(1) : null;

            const startTime = log.startTime
              ? new Date(log.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null;
            const endTime = log.endTime
              ? new Date(log.endTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null;

            return (
              <div
                key={log.id}
                className="rounded-2xl border border-border bg-card p-4 space-y-2"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {vehicleTypeIcons[log.vehicleType] ?? "🔧"}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">
                        {log.vehicleName}
                      </p>
                      <p className="text-xs text-muted-foreground">{log.date}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                      isComplete
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {isComplete ? t("logCompleted") : t("activeLog")}
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5" />
                    {t("startHours")}: {log.startEngineHours}
                  </span>
                  {endH !== null && (
                    <span className="flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" />
                      {t("endHours")}: {log.endEngineHours}
                    </span>
                  )}
                  {startTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {startTime}
                      {endTime ? ` → ${endTime}` : ""}
                    </span>
                  )}
                  {worked && (
                    <span className="font-medium text-foreground">
                      {t("hoursWorked")}: {worked} hrs
                    </span>
                  )}
                  {log.fuelUsedLiters && (
                    <span className="flex items-center gap-1">
                      <Fuel className="h-3.5 w-3.5" />
                      {t("fuelUsed")}: {log.fuelUsedLiters} L
                    </span>
                  )}
                  {log.kmTraveled && (
                    <span>
                      {t("kmTraveled")}: {log.kmTraveled} km
                    </span>
                  )}
                  {log.acresWorked && (
                    <span>
                      {t("acresWorked")}: {log.acresWorked} ac
                    </span>
                  )}
                </div>

                {log.notes && (
                  <p className="text-xs text-muted-foreground italic border-t border-border pt-2">
                    {log.notes}
                  </p>
                )}

                {log.syncStatus === "local" && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 font-medium border-t border-border pt-2">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    {t("syncPending")}
                  </div>
                )}
                {log.syncStatus === "synced" && (
                  <div className="flex items-center gap-1 text-xs text-green-600 border-t border-border pt-2">
                    <CheckCheck className="h-3 w-3" />
                    Synced
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
