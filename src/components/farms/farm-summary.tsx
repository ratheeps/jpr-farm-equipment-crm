"use client";

import { useTranslations } from "next-intl";

interface FarmSummaryProps {
  summary: {
    totalInputCost: number;
    totalRevenue: number;
    profit: number;
    roi: number;
    costPerAcre: number;
    revenuePerAcre: number;
    areaAcres: number;
  };
}

export function FarmSummary({ summary }: FarmSummaryProps) {
  const t = useTranslations("farms");

  const isProfitable = summary.profit >= 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        {t("summary")}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("totalInputCost")}
          </p>
          <p className="text-sm font-semibold text-red-600">
            Rs. {summary.totalInputCost.toLocaleString()}
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("totalRevenue")}
          </p>
          <p className="text-sm font-semibold text-green-600">
            Rs. {summary.totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {isProfitable ? t("profit") : t("loss")}
          </p>
          <p
            className={`text-sm font-semibold ${
              isProfitable ? "text-green-600" : "text-red-600"
            }`}
          >
            Rs. {Math.abs(summary.profit).toLocaleString()}
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("roi")}
          </p>
          <p
            className={`text-sm font-semibold ${
              summary.roi >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {summary.roi.toFixed(1)}%
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("costPerAcre")}
          </p>
          <p className="text-sm font-medium text-foreground">
            Rs. {summary.costPerAcre.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("revenuePerAcre")}
          </p>
          <p className="text-sm font-medium text-foreground">
            Rs. {summary.revenuePerAcre.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  );
}
