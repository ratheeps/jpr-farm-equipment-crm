import { Clock, Fuel, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { StaffPerformanceRow } from "@/lib/actions/reports";

interface PerformanceSummaryProps {
  rows: StaffPerformanceRow[];
}

export function PerformanceSummary({ rows }: PerformanceSummaryProps) {
  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No performance data for this period
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const idle = row.idleRatioPct;
        const IdleIcon =
          idle === null ? Minus : idle > 30 ? TrendingDown : TrendingUp;
        const idleColor =
          idle === null
            ? "text-muted-foreground"
            : idle > 50
            ? "text-destructive"
            : idle > 30
            ? "text-amber-500"
            : "text-green-600";

        return (
          <div
            key={row.staffProfileId}
            className="rounded-2xl bg-card border border-border px-4 py-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-foreground">{row.staffName}</p>
                {row.phone && (
                  <p className="text-xs text-muted-foreground">{row.phone}</p>
                )}
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold ${idleColor}`}>
                <IdleIcon className="h-4 w-4" />
                {idle !== null ? `${idle}% idle` : "—"}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">{row.totalLogs}</p>
                <p className="text-xs text-muted-foreground">Logs</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">
                  {row.totalHours.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Hours</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">
                  {row.totalFuelLiters.toFixed(0)}L
                </p>
                <p className="text-xs text-muted-foreground">Fuel</p>
              </div>
              <div className="text-center">
                {row.totalAcres > 0 ? (
                  <>
                    <p className="text-sm font-bold text-foreground">
                      {row.totalAcres.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">Acres</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-foreground">
                      {row.totalKm.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">KM</p>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
