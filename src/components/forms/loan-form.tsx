"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createLoan, updateLoan } from "@/lib/actions/finance";

type LoanType = "bank_loan" | "personal_borrowing" | "equipment_lease";

interface LoanFormProps {
  locale: string;
  availableVehicles: Array<{ id: string; name: string }>;
  initial?: {
    id: string;
    loanType: LoanType;
    lenderName: string;
    lenderPhone?: string | null;
    principalAmount: string;
    interestRatePercent?: string | null;
    interestType?: string | null;
    termMonths?: number | null;
    emiAmount?: string | null;
    startDate: string;
    endDate?: string | null;
    vehicleId?: string | null;
    notes?: string | null;
  };
}

export function LoanForm({ locale, availableVehicles, initial }: LoanFormProps) {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [form, setForm] = useState({
    loanType: (initial?.loanType ?? "bank_loan") as LoanType,
    lenderName: initial?.lenderName ?? "",
    lenderPhone: initial?.lenderPhone ?? "",
    principalAmount: initial?.principalAmount ?? "",
    interestRatePercent: initial?.interestRatePercent ?? "",
    interestType: initial?.interestType ?? "reducing",
    termMonths: initial?.termMonths != null ? String(initial.termMonths) : "",
    emiAmount: initial?.emiAmount ?? "",
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
    vehicleId: initial?.vehicleId ?? "",
    notes: initial?.notes ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (initial?.id) {
        await updateLoan(initial.id, form);
      } else {
        await createLoan(form);
        router.push(`/${locale}/owner/finance`);
        return;
      }
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  const loanTypes: LoanType[] = ["bank_loan", "personal_borrowing", "equipment_lease"];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      {/* Loan Type */}
      <Field label={t("loanType")}>
        <div className="grid grid-cols-3 gap-2">
          {loanTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set("loanType", type)}
              className={`h-11 rounded-lg border text-xs font-medium transition-colors ${
                form.loanType === type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background text-foreground"
              }`}
            >
              {t(`loanTypes.${type}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </Field>

      {/* Lender Name */}
      <Field label={t("lender")}>
        <Input
          value={form.lenderName}
          onChange={(v) => set("lenderName", v)}
          required
          placeholder={t("lender")}
        />
      </Field>

      {/* Lender Phone */}
      <Field label={t("lenderPhone")}>
        <Input
          type="tel"
          value={form.lenderPhone}
          onChange={(v) => set("lenderPhone", v)}
          placeholder="07X XXX XXXX"
        />
      </Field>

      {/* Principal Amount */}
      <Field label={t("principal")}>
        <Input
          type="number"
          value={form.principalAmount}
          onChange={(v) => set("principalAmount", v)}
          required
          placeholder="0.00"
          step="0.01"
        />
      </Field>

      {/* Interest Rate & Type */}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("interestRate")}>
          <Input
            type="number"
            value={form.interestRatePercent}
            onChange={(v) => set("interestRatePercent", v)}
            placeholder="0.00"
            step="0.01"
          />
        </Field>
        <Field label={t("interestType")}>
          <div className="grid grid-cols-2 gap-1">
            {["flat", "reducing"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => set("interestType", type)}
                className={`h-12 rounded-lg border text-xs font-medium transition-colors ${
                  form.interestType === type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input bg-background text-foreground"
                }`}
              >
                {t(`interestTypes.${type}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* Term & EMI */}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("termMonths")}>
          <Input
            type="number"
            value={form.termMonths}
            onChange={(v) => set("termMonths", v)}
            placeholder="12"
            step="1"
          />
        </Field>
        <Field label={t("emiAmount")}>
          <Input
            type="number"
            value={form.emiAmount}
            onChange={(v) => set("emiAmount", v)}
            placeholder="0.00"
            step="0.01"
          />
        </Field>
      </div>

      {/* Start & End Date */}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("startDate")}>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            required
            className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
          />
        </Field>
        <Field label={t("endDate")}>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => set("endDate", e.target.value)}
            className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
          />
        </Field>
      </div>

      {/* Vehicle (for equipment lease) */}
      {form.loanType === "equipment_lease" && (
        <Field label={t("vehicle")}>
          <select
            value={form.vehicleId}
            onChange={(e) => set("vehicleId", e.target.value)}
            className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
          >
            <option value="">— {t("vehicle")} —</option>
            {availableVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
      )}

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
