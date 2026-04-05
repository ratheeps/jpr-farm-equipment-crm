"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { addInput, deleteInput } from "@/lib/actions/farms";
import { Plus, Trash2 } from "lucide-react";

interface FarmInput {
  id: string;
  inputType: string;
  productName: string | null;
  quantity: string | null;
  unit: string | null;
  unitCost: string | null;
  totalCost: string;
  appliedDate: string | null;
  notes: string | null;
}

interface FarmInputsProps {
  cycleId: string;
  inputs: FarmInput[];
}

const inputTypeColors: Record<string, string> = {
  seeds: "bg-green-100 text-green-700",
  fertilizer: "bg-amber-100 text-amber-700",
  pesticide: "bg-red-100 text-red-700",
  water: "bg-blue-100 text-blue-700",
  labor: "bg-purple-100 text-purple-700",
};

const INPUT_TYPES = ["seeds", "fertilizer", "pesticide", "water", "labor"] as const;

export function FarmInputs({ cycleId, inputs }: FarmInputsProps) {
  const t = useTranslations("farms");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [inputType, setInputType] = useState<string>("seeds");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [appliedDate, setAppliedDate] = useState("");
  const [notes, setNotes] = useState("");

  const totalInputCost = inputs.reduce(
    (sum, i) => sum + parseFloat(i.totalCost || "0"),
    0
  );

  // Auto-calc totalCost
  function handleQuantityChange(v: string) {
    setQuantity(v);
    if (v && unitCost) setTotalCost(String(parseFloat(v) * parseFloat(unitCost)));
  }
  function handleUnitCostChange(v: string) {
    setUnitCost(v);
    if (quantity && v) setTotalCost(String(parseFloat(quantity) * parseFloat(v)));
  }

  function resetForm() {
    setShowForm(false);
    setInputType("seeds");
    setProductName("");
    setQuantity("");
    setUnit("");
    setUnitCost("");
    setTotalCost("");
    setAppliedDate("");
    setNotes("");
  }

  async function handleAdd() {
    if (!totalCost) return;
    setLoading(true);
    try {
      await addInput(cycleId, {
        inputType,
        productName: productName || undefined,
        quantity: quantity || undefined,
        unit: unit || undefined,
        unitCost: unitCost || undefined,
        totalCost,
        appliedDate: appliedDate || undefined,
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
      await deleteInput(id);
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground">{t("inputs")}</h4>
        {totalInputCost > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("totalCost")}: Rs. {totalInputCost.toLocaleString()}
          </span>
        )}
      </div>

      {inputs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t("noInputs")}</p>
      ) : (
        <div className="space-y-2 mb-3">
          {inputs.map((inp) => (
            <div
              key={inp.id}
              className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2"
            >
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  inputTypeColors[inp.inputType] ?? "bg-secondary text-secondary-foreground"
                }`}
              >
                {t(`inputTypes.${inp.inputType}` as Parameters<typeof t>[0])}
              </span>
              <div className="flex-1 min-w-0">
                {inp.productName && (
                  <p className="text-xs font-medium text-foreground truncate">
                    {inp.productName}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {inp.quantity && inp.unit
                    ? `${inp.quantity} ${inp.unit}`
                    : inp.appliedDate ?? ""}
                </p>
              </div>
              <span className="text-xs font-medium text-foreground flex-shrink-0">
                Rs. {Number(inp.totalCost).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(inp.id)}
                disabled={deleting === inp.id}
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
          {/* Input Type Selector */}
          <div className="grid grid-cols-3 gap-1.5">
            {INPUT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setInputType(type)}
                className={`h-9 rounded-lg border text-xs font-medium transition-colors ${
                  inputType === type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input bg-background text-foreground"
                }`}
              >
                {t(`inputTypes.${type}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder={t("productName")}
            className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />

          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder={t("quantity")}
              step="0.01"
              inputMode="decimal"
              className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={t("unit")}
              className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            <input
              type="number"
              value={unitCost}
              onChange={(e) => handleUnitCostChange(e.target.value)}
              placeholder={t("unitCost")}
              step="0.01"
              inputMode="decimal"
              className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              placeholder={t("totalCost")}
              required
              step="0.01"
              inputMode="decimal"
              className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
            <input
              type="date"
              value={appliedDate}
              onChange={(e) => setAppliedDate(e.target.value)}
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
              disabled={loading || !totalCost}
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
          {t("addInput")}
        </button>
      )}
    </div>
  );
}
