"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createQuote, updateQuote } from "@/lib/actions/quotes";

type Unit = "hours" | "acres" | "km" | "tasks";

type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unit: Unit | "";
  rate: string;
  amount: string;
};

interface Project {
  id: string;
  name: string;
}

interface QuoteFormProps {
  locale: string;
  projects: Project[];
  initial?: {
    id: string;
    quoteNumber: string;
    projectId?: string | null;
    clientName: string;
    clientPhone?: string | null;
    subtotal: string;
    total: string;
    validUntil?: string | null;
    notes?: string | null;
    items: {
      id: string;
      description: string;
      quantity: string;
      unit?: string | null;
      rate: string;
      amount: string;
      sortOrder?: number | null;
    }[];
  };
  generatedNumber?: string;
}

function calcAmount(quantity: string, rate: string): string {
  const q = parseFloat(quantity) || 0;
  const r = parseFloat(rate) || 0;
  return (q * r).toFixed(2);
}

function calcSubtotal(items: LineItem[]): string {
  return items
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    .toFixed(2);
}

export function QuoteForm({
  locale,
  projects,
  initial,
  generatedNumber = "",
}: QuoteFormProps) {
  const t = useTranslations("invoices");
  const tQ = useTranslations("quotes");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [header, setHeader] = useState({
    quoteNumber: initial?.quoteNumber ?? generatedNumber,
    projectId: initial?.projectId ?? "",
    clientName: initial?.clientName ?? "",
    clientPhone: initial?.clientPhone ?? "",
    validUntil: initial?.validUntil ?? "",
    notes: initial?.notes ?? "",
  });

  const [items, setItems] = useState<LineItem[]>(
    initial?.items.length
      ? initial.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit: (item.unit as Unit) ?? "",
          rate: item.rate,
          amount: item.amount,
        }))
      : [{ id: crypto.randomUUID(), description: "", quantity: "1", unit: "", rate: "", amount: "" }]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setH(field: string, value: string) {
    setHeader((prev) => ({ ...prev, [field]: value }));
  }

  function updateItem(id: string, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "rate") {
          updated.amount = calcAmount(
            field === "quantity" ? value : item.quantity,
            field === "rate" ? value : item.rate
          );
        }
        return updated;
      })
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", quantity: "1", unit: "", rate: "", amount: "" },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const subtotal = calcSubtotal(items);
  const total = subtotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      setError(t("noItems"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        quoteNumber: header.quoteNumber,
        projectId: header.projectId || undefined,
        clientName: header.clientName,
        clientPhone: header.clientPhone || undefined,
        subtotal,
        total,
        validUntil: header.validUntil || undefined,
        notes: header.notes || undefined,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || undefined,
          rate: item.rate,
          amount: item.amount,
        })),
      };

      if (initial?.id) {
        await updateQuote(initial.id, payload);
      } else {
        await createQuote(payload);
      }
      router.push(`/${locale}/admin/quotes`);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  const units: (Unit | "")[] = ["", "hours", "acres", "km", "tasks"];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      {/* Quote number */}
      <Field label={tQ("quoteNumber")}>
        <Input
          value={header.quoteNumber}
          onChange={(v) => setH("quoteNumber", v)}
          required
          placeholder="QUO-202504-001"
        />
      </Field>

      {/* Project */}
      <Field label={t("project")}>
        <select
          value={header.projectId}
          onChange={(e) => setH("projectId", e.target.value)}
          className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
        >
          <option value="">{t("noProject")}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      {/* Client */}
      <Field label={t("clientName")}>
        <Input
          value={header.clientName}
          onChange={(v) => setH("clientName", v)}
          required
          placeholder={t("clientName")}
        />
      </Field>
      <Field label={t("clientPhone")}>
        <Input
          value={header.clientPhone}
          onChange={(v) => setH("clientPhone", v)}
          placeholder="07X XXX XXXX"
          type="tel"
        />
      </Field>

      {/* Valid Until */}
      <Field label={tQ("validUntil")}>
        <Input
          type="date"
          value={header.validUntil}
          onChange={(v) => setH("validUntil", v)}
        />
      </Field>

      {/* Line items */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t("addItem")}</p>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-secondary/40 border border-border rounded-xl p-3 space-y-2"
            >
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(item.id, "description", e.target.value)}
                placeholder={t("description")}
                required
                className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("quantity")}</p>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                    placeholder="1"
                    step="0.01"
                    inputMode="decimal"
                    className="w-full h-10 px-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("unit")}</p>
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                    className="w-full h-10 px-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u ? t(`units.${u}` as Parameters<typeof t>[0]) : "—"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("rate")}</p>
                  <input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, "rate", e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    inputMode="decimal"
                    className="w-full h-10 px-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("lineAmount")}</p>
                  <input
                    type="text"
                    value={item.amount}
                    readOnly
                    className="w-full h-10 px-2 border border-input rounded-lg bg-secondary text-foreground text-sm cursor-default"
                  />
                </div>
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="flex items-center gap-1 text-xs text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  {t("removeItem")}
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-2 w-full h-10 border border-dashed border-primary text-primary rounded-xl justify-center text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          {t("addItem")}
        </button>
      </div>

      {/* Total */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex justify-between text-base font-bold">
          <span>{t("total")}</span>
          <span>Rs. {Number(total).toLocaleString()}</span>
        </div>
      </div>

      {/* Notes */}
      <Field label={tCommon("notes")}>
        <textarea
          value={header.notes}
          onChange={(e) => setH("notes", e.target.value)}
          className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base resize-none"
          rows={3}
        />
      </Field>

      {error && (
        <p className="text-destructive text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-xl text-base disabled:opacity-60"
      >
        {loading ? tCommon("loading") : tCommon("save")}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      inputMode={type === "number" ? "decimal" : undefined}
      className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
    />
  );
}
