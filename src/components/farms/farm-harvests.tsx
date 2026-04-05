"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addHarvest, deleteHarvest } from "@/lib/actions/farms";
import { Plus, Trash2 } from "lucide-react";

interface FarmHarvest {
  id: string;
  harvestDate: string;
  weightKg: string;
  grade: string | null;
  pricePerKg: string | null;
  revenue: string | null;
  notes: string | null;
}

interface FarmHarvestsProps {
  cycleId: string;
  harvests: FarmHarvest[];
}

export function FarmHarvests({ cycleId, harvests }: FarmHarvestsProps) {
  const t = useTranslations("farms");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [harvestDate, setHarvestDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [grade, setGrade] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [revenue, setRevenue] = useState("");
  const [notes, setNotes] = useState("");

  const totalRevenue = harvests.reduce(
    (sum, h) => sum + parseFloat(h.revenue || "0"),
    0
  );

  // Auto-calc revenue
  function handleWeightChange(v: string) {
    setWeightKg(v);
    if (v && pricePerKg) setRevenue(String(parseFloat(v) * parseFloat(pricePerKg)));
  }
  function handlePriceChange(v: string) {
    setPricePerKg(v);
    if (weightKg && v) setRevenue(String(parseFloat(weightKg) * parseFloat(v)));
  }

  function resetForm() {
    setShowForm(false);
    setHarvestDate("");
    setWeightKg("");
    setGrade("");
    setPricePerKg("");
    setRevenue("");
    setNotes("");
  }

  async function handleAdd() {
    if (!harvestDate || !weightKg) return;
    setLoading(true);
    try {
      await addHarvest(cycleId, {
        harvestDate,
        weightKg,
        grade: grade || undefined,
        pricePerKg: pricePerKg || undefined,
        revenue: revenue || undefined,
        notes: notes || undefined,
      });
      resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(tCommon("confirm"))) return;
    setDeleting(id);
    try {
      await deleteHarvest(id);
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground">{t("harvests")}</h4>
        {totalRevenue > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("totalRevenue")}: Rs. {totalRevenue.toLocaleString()}
          </span>
        )}
      </div>

      {harvests.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t("noHarvests")}</p>
      ) : (
        <div className="space-y-2 mb-3">
          {harvests.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {h.harvestDate}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {h.weightKg} kg
                  {h.grade && ` · ${h.grade}`}
                  {h.pricePerKg && ` · Rs.${Number(h.pricePerKg).toLocaleString()}/kg`}
                </p>
              </div>
              {h.revenue && (
                <span className="text-xs font-medium text-green-600 flex-shrink-0">
                  Rs. {Number(h.revenue).toLocaleString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(h.id)}
                disabled={deleting === h.id}
                className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="bg-background border border-border rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">
                {t("harvestDate")}
              </label>
              <input
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                required
                className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">
                {t("weightKg")}
              </label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => handleWeightChange(e.target.value)}
                required
                step="0.01"
                inputMode="decimal"
                className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder={t("grade")}
              className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            <input
              type="number"
              value={pricePerKg}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder={t("pricePerKg")}
              step="0.01"
              inputMode="decimal"
              className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            <input
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              placeholder={t("revenue")}
              step="0.01"
              inputMode="decimal"
              className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
              disabled={loading || !harvestDate || !weightKg}
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
          className="flex items-center justify-center gap-1.5 w-full h-9 border border-input rounded-lg text-xs font-medium text-foreground bg-background"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("addHarvest")}
        </button>
      )}
    </div>
  );
}
