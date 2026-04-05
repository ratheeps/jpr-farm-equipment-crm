"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  createMaintenanceSchedule,
  deleteMaintenanceSchedule,
} from "@/lib/actions/maintenance";
import { Plus, Trash2, AlertTriangle, Clock, CheckCircle } from "lucide-react";

interface MaintenanceSchedule {
  id: string;
  vehicleId: string;
  type: string;
  intervalHours: number;
  lastServiceHours: string | null;
  nextDueHours: string | null;
  isOverdue: boolean;
}

interface Props {
  vehicleId: string;
  schedules: MaintenanceSchedule[];
  currentEngineHours: number;
  readonly?: boolean;
  canDelete?: boolean;
}

const SERVICE_TYPES = [
  "oil_change",
  "filter",
  "overhaul",
  "tire",
  "other",
] as const;

export function MaintenanceSchedules({
  vehicleId,
  schedules,
  currentEngineHours,
  readonly = false,
  canDelete = false,
}: Props) {
  const t = useTranslations("maintenance");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [type, setType] = useState("oil_change");
  const [intervalHours, setIntervalHours] = useState("");
  const [lastServiceHours, setLastServiceHours] = useState("");

  const overdueCount = schedules.filter((s) => s.isOverdue).length;

  function resetForm() {
    setShowForm(false);
    setType("oil_change");
    setIntervalHours("");
    setLastServiceHours("");
  }

  async function handleAdd() {
    if (!intervalHours) return;
    setLoading(true);
    try {
      await createMaintenanceSchedule(vehicleId, {
        type,
        intervalHours: Number(intervalHours),
        lastServiceHours: lastServiceHours ? Number(lastServiceHours) : undefined,
      });
      resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    setDeleting(id);
    try {
      await deleteMaintenanceSchedule(id, vehicleId);
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  function getStatusInfo(schedule: MaintenanceSchedule) {
    const nextDue = Number(schedule.nextDueHours ?? 0);
    const hoursRemaining = nextDue - currentEngineHours;

    if (schedule.isOverdue) {
      return {
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: t("overdue"),
        className: "bg-red-100 text-red-700",
      };
    }
    if (hoursRemaining <= 50) {
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: `${t("dueIn")} ${Math.round(hoursRemaining)} ${t("hrs")}`,
        className: "bg-orange-100 text-orange-700",
      };
    }
    return {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      label: `${Math.round(hoursRemaining)} ${t("hrs")}`,
      className: "bg-green-100 text-green-700",
    };
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">
          {t("schedules")}
        </h2>
        {overdueCount > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {overdueCount} {t("overdue")}
          </span>
        )}
      </div>

      {schedules.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("noSchedules")}
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {schedules.map((s) => {
            const status = getStatusInfo(s);
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {t(`serviceTypes.${s.type}` as Parameters<typeof t>[0])}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.className}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("intervalHours")}: {s.intervalHours} ·{" "}
                    {t("nextDueHours")}: {s.nextDueHours ?? "—"}
                    {s.lastServiceHours &&
                      ` · ${t("lastServiceHours")}: ${s.lastServiceHours}`}
                  </p>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readonly && (
        <>
          {showForm ? (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="space-y-1">
                <label className="block text-xs text-muted-foreground">
                  {t("serviceType")}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                >
                  {SERVICE_TYPES.map((st) => (
                    <option key={st} value={st}>
                      {t(`serviceTypes.${st}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs text-muted-foreground">
                    {t("intervalHours")}
                  </label>
                  <input
                    type="number"
                    value={intervalHours}
                    onChange={(e) => setIntervalHours(e.target.value)}
                    required
                    placeholder="250"
                    inputMode="numeric"
                    className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-muted-foreground">
                    {t("lastServiceHours")}
                  </label>
                  <input
                    type="number"
                    value={lastServiceHours}
                    onChange={(e) => setLastServiceHours(e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    step="0.1"
                    className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
              </div>

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
                  onClick={handleAdd}
                  disabled={loading || !intervalHours}
                  className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {loading ? tCommon("loading") : tCommon("save")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 w-full h-11 border border-input rounded-xl text-sm font-medium text-foreground bg-background"
            >
              <Plus className="h-4 w-4" />
              {t("addSchedule")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
