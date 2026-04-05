"use client";

import { useState, useTransition } from "react";
import { deleteSchedule } from "@/lib/actions/schedules";
import { useRouter } from "next/navigation";
import { Trash2, Calendar, Car, Briefcase } from "lucide-react";

interface ScheduleEntry {
  id: string;
  staffId: string;
  staffName: string | null;
  vehicleId: string | null;
  vehicleName: string | null;
  projectId: string | null;
  projectName: string | null;
  date: string;
  shiftType: string;
  notes: string | null;
}

interface ScheduleCalendarProps {
  schedules: ScheduleEntry[];
  dateFrom: string;
  dateTo: string;
}

const SHIFT_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  full_day: "Full Day",
};

function getDatesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function ScheduleCalendar({
  schedules,
  dateFrom,
  dateTo,
}: ScheduleCalendarProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  const dates = getDatesInRange(dateFrom, dateTo);

  // Group by staffId → date → entry
  const byStaff = new Map<
    string,
    { staffName: string; entries: Map<string, ScheduleEntry> }
  >();

  for (const s of schedules) {
    if (!byStaff.has(s.staffId)) {
      byStaff.set(s.staffId, {
        staffName: s.staffName ?? s.staffId,
        entries: new Map(),
      });
    }
    byStaff.get(s.staffId)!.entries.set(s.date, s);
  }

  async function handleDelete(id: string) {
    setRemoving(id);
    try {
      await deleteSchedule(id);
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  if (byStaff.size === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No schedules for this period
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground py-2 pr-4 whitespace-nowrap sticky left-0 bg-background z-10">
              Operator
            </th>
            {dates.map((d) => (
              <th
                key={d}
                className="text-center text-xs font-medium text-muted-foreground py-2 px-2 whitespace-nowrap min-w-[90px]"
              >
                {new Date(d).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...byStaff.entries()].map(([staffId, { staffName, entries }]) => (
            <tr key={staffId} className="border-t border-border">
              <td className="py-2 pr-4 font-medium text-foreground whitespace-nowrap sticky left-0 bg-background z-10">
                {staffName}
              </td>
              {dates.map((d) => {
                const entry = entries.get(d);
                return (
                  <td key={d} className="py-2 px-2 align-top">
                    {entry ? (
                      <div className="rounded-lg bg-primary/10 border border-primary/20 px-2 py-1.5 min-h-[54px] relative">
                        <p className="text-xs font-medium text-primary leading-tight">
                          {SHIFT_LABELS[entry.shiftType]}
                        </p>
                        {entry.vehicleName && (
                          <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                            <Car className="h-3 w-3" />
                            {entry.vehicleName}
                          </p>
                        )}
                        {entry.projectName && (
                          <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                            <Briefcase className="h-3 w-3" />
                            {entry.projectName}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          disabled={removing === entry.id}
                          className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center text-destructive/60 hover:text-destructive disabled:opacity-40"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-[54px] rounded-lg border border-dashed border-border/40" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
