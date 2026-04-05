"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createReceivable, updateReceivable } from "@/lib/actions/finance";

type ReceivableType = "project_payment" | "personal_lending";

interface ReceivableFormProps {
  locale: string;
  availableProjects: Array<{ id: string; name: string }>;
  initial?: {
    id: string;
    type: ReceivableType;
    debtorName: string;
    debtorPhone?: string | null;
    projectId?: string | null;
    principalAmount: string;
    interestRatePercent?: string | null;
    totalDue: string;
    dueDate?: string | null;
    notes?: string | null;
  };
}

export function ReceivableForm({ locale, availableProjects, initial }: ReceivableFormProps) {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [form, setForm] = useState({
    type: (initial?.type ?? "project_payment") as ReceivableType,
    debtorName: initial?.debtorName ?? "",
    debtorPhone: initial?.debtorPhone ?? "",
    projectId: initial?.projectId ?? "",
    principalAmount: initial?.principalAmount ?? "",
    interestRatePercent: initial?.interestRatePercent ?? "",
    totalDue: initial?.totalDue ?? "",
    dueDate: initial?.dueDate ?? "",
    notes: initial?.notes ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Auto-calc totalDue from principal + interest
  function handlePrincipalChange(v: string) {
    set("principalAmount", v);
    if (v && form.interestRatePercent) {
      const interest = parseFloat(v) * (parseFloat(form.interestRatePercent) / 100);
      set("totalDue", String((parseFloat(v) + interest).toFixed(2)));
    } else {
      set("totalDue", v);
    }
  }

  function handleInterestChange(v: string) {
    set("interestRatePercent", v);
    if (form.principalAmount && v) {
      const interest = parseFloat(form.principalAmount) * (parseFloat(v) / 100);
      set("totalDue", String((parseFloat(form.principalAmount) + interest).toFixed(2)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (initial?.id) {
        await updateReceivable(initial.id, form);
      } else {
        await createReceivable(form);
        router.push(`/${locale}/owner/finance`);
        return;
      }
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  const receivableTypes: ReceivableType[] = ["project_payment", "personal_lending"];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      {/* Type */}
      <Field label={tCommon("status")}>
        <div className="grid grid-cols-2 gap-2">
          {receivableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set("type", type)}
              className={`h-11 rounded-lg border text-xs font-medium transition-colors ${
                form.type === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background text-foreground"
              }`}
            >
              {t(`receivableTypes.${type}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </Field>

      {/* Debtor Name */}
      <Field label={t("debtor")}>
        <Input
          value={form.debtorName}
          onChange={(v) => set("debtorName", v)}
          required
          placeholder={t("debtor")}
        />
      </Field>

      {/* Debtor Phone */}
      <Field label={t("debtorPhone")}>
        <Input
          type="tel"
          value={form.debtorPhone}
          onChange={(v) => set("debtorPhone", v)}
          placeholder="07X XXX XXXX"
        />
      </Field>

      {/* Project Link (project_payment only) */}
      {form.type === "project_payment" && (
        <Field label={t("receivableTypes.project_payment" as Parameters<typeof t>[0])}>
          <select
            value={form.projectId}
            onChange={(e) => set("projectId", e.target.value)}
            className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
          >
            <option value="">— Select Project —</option>
            {availableProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Principal */}
      <Field label={t("principal")}>
        <Input
          type="number"
          value={form.principalAmount}
          onChange={handlePrincipalChange}
          required
          placeholder="0.00"
          step="0.01"
        />
      </Field>

      {/* Interest Rate */}
      <Field label={t("interestRate")}>
        <Input
          type="number"
          value={form.interestRatePercent}
          onChange={handleInterestChange}
          placeholder="0.00"
          step="0.01"
        />
      </Field>

      {/* Total Due */}
      <Field label={t("totalDue")}>
        <Input
          type="number"
          value={form.totalDue}
          onChange={(v) => set("totalDue", v)}
          required
          placeholder="0.00"
          step="0.01"
        />
      </Field>

      {/* Due Date */}
      <Field label={t("dueDate")}>
        <input
          type="date"
          value={form.dueDate}
          onChange={(e) => set("dueDate", e.target.value)}
          className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
        />
      </Field>

      {/* Notes */}
      <Field label={tCommon("notes")}>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
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
  step,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      step={step}
      inputMode={type === "number" ? "decimal" : type === "tel" ? "tel" : undefined}
      className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
    />
  );
}
