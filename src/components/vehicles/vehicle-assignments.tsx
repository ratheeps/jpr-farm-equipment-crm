"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, User, Plus, X, Star } from "lucide-react";
import {
  assignOperatorToVehicle,
  removeVehicleAssignment,
} from "@/lib/actions/vehicle-assignments";

interface Assignment {
  id: string;
  staffId: string;
  staffName: string | null;
  staffPhone: string | null;
  isPrimary: boolean;
  assignedFrom: string;
  assignedTo: string | null;
  reason: string | null;
}

interface Operator {
  staffProfileId: string;
  fullName: string | null;
  currentVehicle: string | null;
}

interface VehicleAssignmentsProps {
  vehicleId: string;
  assignments: Assignment[];
  availableOperators: Operator[];
}

export function VehicleAssignments({
  vehicleId,
  assignments,
  availableOperators,
}: VehicleAssignmentsProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [assignedFrom, setAssignedFrom] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [assignedTo, setAssignedTo] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");

  function resetForm() {
    setShowForm(false);
    setStaffId("");
    setAssignedFrom(new Date().toISOString().split("T")[0]);
    setAssignedTo("");
    setIsPrimary(true);
    setReason("");
    setError("");
  }

  async function handleAssign() {
    if (!staffId || !assignedFrom) return;
    setLoading(true);
    setError("");
    try {
      await assignOperatorToVehicle({
        vehicleId,
        staffId,
        assignedFrom,
        assignedTo: assignedTo || undefined,
        isPrimary,
        reason: reason || undefined,
      });
      resetForm();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    try {
      await removeVehicleAssignment(id);
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  const primaryAssignment = assignments.find((a) => a.isPrimary);
  const tempAssignments = assignments.filter((a) => !a.isPrimary);

  return (
    <div className="mt-6 pb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <User className="h-4 w-4" />
          Operator Assignment
        </h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            <Plus className="h-4 w-4" />
            Assign
          </button>
        )}
      </div>

      {/* Primary operator */}
      {primaryAssignment ? (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-3">
          <Star className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {primaryAssignment.staffName ?? "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground">
              Primary · Since {primaryAssignment.assignedFrom}
              {primaryAssignment.assignedTo && ` until ${primaryAssignment.assignedTo}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleRemove(primaryAssignment.id)}
            disabled={removing === primaryAssignment.id}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">No primary operator assigned</p>
      )}

      {/* Temporary assignments */}
      {tempAssignments.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Temporary
          </p>
          {tempAssignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
            >
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {a.staffName ?? "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.assignedFrom} → {a.assignedTo ?? "ongoing"}
                  {a.reason && ` · ${a.reason}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(a.id)}
                disabled={removing === a.id}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Assignment form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Operator <span className="text-destructive">*</span>
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select operator...</option>
              {availableOperators.map((op) => (
                <option key={op.staffProfileId} value={op.staffProfileId}>
                  {op.fullName}
                  {op.currentVehicle ? ` (currently: ${op.currentVehicle})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                From <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={assignedFrom}
                onChange={(e) => setAssignedFrom(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Until (optional)
              </label>
              <input
                type="date"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                min={assignedFrom}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. leave cover, breakdown"
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm text-foreground">
              Set as primary operator (replaces current primary)
            </span>
          </label>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAssign}
              disabled={!staffId || !assignedFrom || loading}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 transition-opacity"
            >
              {loading ? "Assigning..." : "Assign Operator"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 h-11 rounded-xl border border-border text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
