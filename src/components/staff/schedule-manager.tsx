"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScheduleCalendar } from "@/components/staff/schedule-calendar";
import { createSchedule } from "@/lib/actions/schedules";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface Staff {
  id: string;
  fullName: string | null;
}
interface Veh {
  id: string;
  name: string;
}
interface Proj {
  id: string;
  name: string;
}
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

interface Props {
  initialSchedule: ScheduleEntry[];
  staff: Staff[];
  vehicles: Veh[];
  projects: Proj[];
  dateFrom: string;
  dateTo: string;
}

export function ScheduleManager({
  initialSchedule,
  staff,
  vehicles,
  projects,
  dateFrom,
  dateTo,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [shiftType, setShiftType] = useState("full_day");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!staffId || !date) return;
    setError("");
    startTransition(async () => {
      try {
        await createSchedule({
          staffId,
          vehicleId: vehicleId || undefined,
          projectId: projectId || undefined,
          date,
          shiftType,
          notes: notes || undefined,
        });
        setShowForm(false);
        setStaffId("");
        setVehicleId("");
        setProjectId("");
        setNotes("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create schedule");
      }
    });
  }

  function shiftWeek(direction: -1 | 1) {
    const from = new Date(dateFrom);
    from.setDate(from.getDate() + direction * 7);
    const to = new Date(dateTo);
    to.setDate(to.getDate() + direction * 7);
    router.push(
      `?from=${from.toISOString().split("T")[0]}&to=${to.toISOString().split("T")[0]}`
    );
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="text-sm font-medium text-foreground">
          {dateFrom} → {dateTo}
        </span>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar */}
      <ScheduleCalendar
        schedules={initialSchedule}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      {/* Add schedule button */}
      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full h-11 rounded-xl border border-dashed border-primary/50 text-primary text-sm font-medium flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Schedule Entry
        </button>
      )}

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Operator *
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select...</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Shift
              </label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="full_day">Full Day</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Vehicle
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!staffId || !date || isPending}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
            >
              {isPending ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 h-10 rounded-xl border border-border text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
