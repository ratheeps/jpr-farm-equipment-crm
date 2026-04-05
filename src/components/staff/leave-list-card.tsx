"use client";

import { useState, useTransition } from "react";
import { approveLeave, rejectLeave } from "@/lib/actions/leaves";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, Calendar } from "lucide-react";

interface Leave {
  id: string;
  staffId?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  staffName: string | null;
  staffPhone?: string | null;
  createdAt: Date;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

const LEAVE_LABELS: Record<string, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  unpaid: "Unpaid Leave",
  other: "Other",
};

interface LeaveListCardProps {
  leave: Leave;
  canApprove?: boolean;
}

export function LeaveListCard({ leave, canApprove = false }: LeaveListCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(leave.status);

  const statusConfig = STATUS_CONFIG[localStatus] ?? STATUS_CONFIG.pending;

  const dayCount =
    Math.ceil(
      (new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  function handleApprove() {
    startTransition(async () => {
      await approveLeave(leave.id);
      setLocalStatus("approved");
      router.refresh();
    });
  }

  function handleReject() {
    startTransition(async () => {
      await rejectLeave(leave.id);
      setLocalStatus("rejected");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-card border border-border px-4 py-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          {leave.staffName && (
            <p className="text-sm font-semibold text-foreground">{leave.staffName}</p>
          )}
          <p className="text-sm text-foreground font-medium">
            {LEAVE_LABELS[leave.leaveType] ?? leave.leaveType}
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusConfig.className}`}
        >
          {statusConfig.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {leave.startDate} → {leave.endDate}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {dayCount} day{dayCount !== 1 ? "s" : ""}
        </span>
      </div>

      {leave.reason && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{leave.reason}</p>
      )}

      {canApprove && localStatus === "pending" && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending}
            className="flex items-center gap-1 flex-1 justify-center h-9 rounded-xl bg-green-600 text-white text-sm font-medium disabled:opacity-40"
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isPending}
            className="flex items-center gap-1 flex-1 justify-center h-9 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-40"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
