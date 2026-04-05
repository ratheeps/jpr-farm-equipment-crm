import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface WorkLog {
  id: string;
  date: string;
  vehicleName: string;
  vehicleType: string;
  startEngineHours: string;
  endEngineHours: string | null;
  fuelUsedLiters: string | null;
  kmTraveled: string | null;
  acresWorked: string | null;
  notes: string | null;
  syncStatus: string;
}

interface StaffWorkHistoryProps {
  logs: WorkLog[];
  page: number;
  userId: string;
  locale: string;
  hasMore: boolean;
}

export function StaffWorkHistory({
  logs,
  page,
  userId,
  locale,
  hasMore,
}: StaffWorkHistoryProps) {
  if (logs.length === 0 && page === 1) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No work logs recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {logs.map((log) => {
        const hours =
          log.endEngineHours
            ? (Number(log.endEngineHours) - Number(log.startEngineHours)).toFixed(1)
            : null;
        return (
          <div
            key={log.id}
            className="rounded-xl bg-card border border-border px-4 py-3"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-foreground">{log.vehicleName}</p>
              <span className="text-xs text-muted-foreground">{log.date}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {hours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{hours} hrs</span>}
              {log.fuelUsedLiters && Number(log.fuelUsedLiters) > 0 && (
                <span>{log.fuelUsedLiters}L fuel</span>
              )}
              {log.kmTraveled && Number(log.kmTraveled) > 0 && (
                <span>{log.kmTraveled} km</span>
              )}
              {log.acresWorked && Number(log.acresWorked) > 0 && (
                <span>{log.acresWorked} acres</span>
              )}
              {!log.endEngineHours && (
                <span className="text-amber-600 font-medium">In progress</span>
              )}
              {log.syncStatus === "local" && (
                <span className="text-amber-600 font-medium">Unsynced</span>
              )}
            </div>
            {log.notes && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{log.notes}</p>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        {page > 1 ? (
          <Link
            href={`/${locale}/admin/staff/${userId}?page=${page - 1}#history`}
            className="flex items-center gap-1 text-sm text-primary font-medium"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted-foreground">Page {page}</span>
        {hasMore ? (
          <Link
            href={`/${locale}/admin/staff/${userId}?page=${page + 1}#history`}
            className="flex items-center gap-1 text-sm text-primary font-medium"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
