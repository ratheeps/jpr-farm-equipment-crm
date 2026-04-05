"use client";

import { useState, useTransition } from "react";
import { requestLeave } from "@/lib/actions/leaves";
import { useRouter } from "next/navigation";

interface LeavFormProps {
  staffId?: string; // if admin creating for someone
  onSuccess?: () => void;
}

const LEAVE_TYPES = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "other", label: "Other" },
];

export function LeaveForm({ staffId, onSuccess }: LeavFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  function handleSubmit() {
    if (!startDate || !endDate) return;
    setError("");
    startTransition(async () => {
      try {
        await requestLeave({
          staffId,
          leaveType,
          startDate,
          endDate,
          reason: reason || undefined,
        });
        setStartDate("");
        setEndDate("");
        setReason("");
        setLeaveType("annual");
        router.refresh();
        onSuccess?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit leave request");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-4">
      <h3 className="text-base font-semibold text-foreground">Request Leave</h3>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Leave Type <span className="text-destructive">*</span>
        </label>
        <select
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
          className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {LEAVE_TYPES.map((lt) => (
            <option key={lt.value} value={lt.value}>
              {lt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Start Date <span className="text-destructive">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            End Date <span className="text-destructive">*</span>
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Reason (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Optional description..."
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!startDate || !endDate || isPending}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 transition-opacity"
      >
        {isPending ? "Submitting..." : "Submit Request"}
      </button>
    </div>
  );
}
