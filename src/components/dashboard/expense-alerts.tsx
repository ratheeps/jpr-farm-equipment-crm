"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Gauge, Fuel, Wrench } from "lucide-react";
import type { ExpenseAlert } from "@/lib/actions/reports";
import { cn } from "@/lib/utils";

interface Props {
  alerts: ExpenseAlert[];
}

const TYPE_ICON = {
  idling: Gauge,
  fuel_anomaly: Fuel,
  maintenance_overdue: Wrench,
};

export function ExpenseAlerts({ alerts }: Props) {
  const t = useTranslations("alerts");

  function getAlertMessage(alert: ExpenseAlert): string {
    if (alert.type === "idling") {
      return t("idling", { idleRatio: alert.idleRatio, hours: alert.hours });
    }
    if (alert.type === "fuel_anomaly") {
      return t(alert.over ? "fuelOver" : "fuelUnder", { pct: alert.pct, liters: alert.liters });
    }
    return t("maintenanceOverdue", { count: alert.count, types: alert.types });
  }

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-700 dark:text-green-400">{t("allClear")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const Icon = TYPE_ICON[alert.type];
        const isCritical = alert.severity === "critical";
        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-xl px-4 py-3 border",
              isCritical
                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                : "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 mt-0.5 flex-shrink-0",
                isCritical ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"
              )}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isCritical ? "text-red-800 dark:text-red-300" : "text-orange-800 dark:text-orange-300"
                )}
              >
                {alert.vehicleName}
              </p>
              <p
                className={cn(
                  "text-xs mt-0.5",
                  isCritical ? "text-red-700 dark:text-red-400" : "text-orange-700 dark:text-orange-400"
                )}
              >
                {getAlertMessage(alert)}
              </p>
            </div>
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0",
                isCritical
                  ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
              )}
            >
              {isCritical ? t("critical") : t("warning")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
