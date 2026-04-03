"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { assignToProject, removeAssignment } from "@/lib/actions/projects";
import { Car, User, Plus, X } from "lucide-react";

interface Assignment {
  id: string;
  vehicleId: string | null;
  vehicleName: string | null;
  staffId: string | null;
  staffName: string | null;
  assignedFrom: string | null;
  assignedTo: string | null;
}

interface ProjectAssignmentsProps {
  projectId: string;
  assignments: Assignment[];
  availableVehicles: Array<{ id: string; name: string }>;
  availableStaff: Array<{ id: string; fullName: string | null }>;
}

type AddMode = "vehicle" | "staff" | null;

export function ProjectAssignments({
  projectId,
  assignments,
  availableVehicles,
  availableStaff,
}: ProjectAssignmentsProps) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [addMode, setAddMode] = useState<AddMode>(null);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [assignedFrom, setAssignedFrom] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");

  function resetForm() {
    setAddMode(null);
    setSelectedVehicle("");
    setSelectedStaff("");
    setAssignedFrom("");
    setAssignedTo("");
    setError("");
  }

  async function handleAssign() {
    setLoading(true);
    setError("");
    try {
      await assignToProject({
        projectId,
        vehicleId: addMode === "vehicle" ? selectedVehicle || undefined : undefined,
        staffId: addMode === "staff" ? selectedStaff || undefined : undefined,
        assignedFrom: assignedFrom || undefined,
        assignedTo: assignedTo || undefined,
      });
      resetForm();
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(assignmentId: string) {
    setRemoving(assignmentId);
    try {
      await removeAssignment(assignmentId);
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="mt-6 pb-8">
      <h2 className="text-base font-semibold text-foreground mb-3">
        {t("assignments")}
      </h2>

      {/* Current assignments */}
      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("noAssignments")}
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
            >
              <div className="flex-shrink-0">
                {a.vehicleId ? (
                  <Car className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {a.vehicleName ?? a.staffName ?? "—"}
                </p>
                {(a.assignedFrom || a.assignedTo) && (
                  <p className="text-xs text-muted-foreground">
                    {a.assignedFrom ?? "—"} → {a.assignedTo ?? "—"}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(a.id)}
                disabled={removing === a.id}
                className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add assignment form */}
      {addMode ? (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">
            {addMode === "vehicle" ? t("assignVehicle") : t("assignStaff")}
          </p>

          {addMode === "vehicle" ? (
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            >
              <option value="">— {t("vehicle")} —</option>
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            >
              <option value="">— {t("staff")} —</option>
              {availableStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName ?? s.id}
                </option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">
                {t("assignedFrom")}
              </label>
              <input
                type="date"
                value={assignedFrom}
                onChange={(e) => setAssignedFrom(e.target.value)}
                className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">
                {t("assignedTo")}
              </label>
              <input
                type="date"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="text-destructive text-xs text-center">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 h-10 border border-input rounded-lg text-sm font-medium text-foreground bg-background"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={
                loading ||
                (addMode === "vehicle" && !selectedVehicle) ||
                (addMode === "staff" && !selectedStaff)
              }
              className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {loading ? tCommon("loading") : tCommon("save")}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAddMode("vehicle")}
            className="flex items-center justify-center gap-2 h-11 border border-input rounded-xl text-sm font-medium text-foreground bg-background"
          >
            <Plus className="h-4 w-4" />
            {t("assignVehicle")}
          </button>
          <button
            type="button"
            onClick={() => setAddMode("staff")}
            className="flex items-center justify-center gap-2 h-11 border border-input rounded-xl text-sm font-medium text-foreground bg-background"
          >
            <Plus className="h-4 w-4" />
            {t("assignStaff")}
          </button>
        </div>
      )}
    </div>
  );
}
