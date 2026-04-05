"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  createMaintenanceRecord,
  deleteMaintenanceRecord,
} from "@/lib/actions/maintenance";
import { Plus, Trash2 } from "lucide-react";

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: string;
  description: string | null;
  cost: string | null;
  engineHoursAtService: string | null;
  serviceDate: string;
  nextServiceDueHours: string | null;
  performedBy: string | null;
}

interface Props {
  vehicleId: string;
  records: MaintenanceRecord[];
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

export function MaintenanceHistory({
  vehicleId,
  records,
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
  const [serviceDate, setServiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [engineHoursAtService, setEngineHoursAtService] = useState("");
  const [cost, setCost] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [description, setDescription] = useState("");

  // Sort newest first for display
  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
  );
  const mostRecent = sortedRecords[0];

  function resetForm() {
    setShowForm(false);
    setType("oil_change");
    setServiceDate(new Date().toISOString().split("T")[0]);
    setEngineHoursAtService("");
    setCost("");
    setPerformedBy("");
    setDescription("");
  }

  async function handleAdd() {
    if (!serviceDate) return;
    setLoading(true);
    try {
      await createMaintenanceRecord(vehicleId, {
        type,
        serviceDate,
        engineHoursAtService: engineHoursAtService
          ? Number(engineHoursAtService)
          : undefined,
        cost: cost ? Number(cost) : undefined,
        performedBy: performedBy || undefined,
        description: description || undefined,
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
      await deleteMaintenanceRecord(id, vehicleId);
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mt-6 pb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">
          {t("records")}
        </h2>
        {mostRecent && (
          <span className="text-xs text-muted-foreground">
            {t("serviceDate")}: {mostRecent.serviceDate}
          </span>
        )}
      </div>

      {sortedRecords.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("noRecords")}
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {sortedRecords.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {t(`serviceTypes.${r.type}` as Parameters<typeof t>[0])}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.serviceDate}
                  </span>
                  {r.cost && (
                    <span className="text-xs font-medium text-destructive">
                      Rs. {Number(r.cost).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.engineHoursAtService &&
                    `${t("engineHoursAtService")}: ${r.engineHoursAtService}`}
                  {r.performedBy && ` · ${r.performedBy}`}
                  {r.description && ` · ${r.description}`}
                </p>
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  disabled={deleting === r.id}
                  className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
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
                    {t("serviceDate")}
                  </label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    required
                    className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-muted-foreground">
                    {t("engineHoursAtService")}
                  </label>
                  <input
                    type="number"
                    value={engineHoursAtService}
                    onChange={(e) => setEngineHoursAtService(e.target.value)}
                    placeholder="0"
                    step="0.1"
                    inputMode="decimal"
                    className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder={`${t("cost")} (Rs.)`}
                  step="0.01"
                  inputMode="decimal"
                  className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
                <input
                  type="text"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  placeholder={t("performedBy")}
                  className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>

              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tCommon("notes")}
                className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />

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
                  disabled={loading || !serviceDate}
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
              {t("addRecord")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
