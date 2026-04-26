"use client";

import { useState, useTransition } from "react";
import { upsertCompanySettings } from "@/lib/actions/company-settings";
import type { CompanySettings } from "@/db/schema/company-settings";

interface Props {
  settings: CompanySettings | null;
}

export function CompanySettingsForm({ settings }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const data = {
      companyName: fd.get("companyName") as string,
      address: fd.get("address") as string,
      phone: fd.get("phone") as string,
      email: fd.get("email") as string,
      taxNumber: fd.get("taxNumber") as string,
      bankName: fd.get("bankName") as string,
      bankAccountNumber: fd.get("bankAccountNumber") as string,
      bankBranch: fd.get("bankBranch") as string,
      invoiceFooterNote: fd.get("invoiceFooterNote") as string,
      defaultIdleWarnPct: fd.get("defaultIdleWarnPct") as string,
      defaultIdleCriticalPct: fd.get("defaultIdleCriticalPct") as string,
      defaultFuelVariancePct: fd.get("defaultFuelVariancePct") as string,
    };
    startTransition(async () => {
      try {
        await upsertCompanySettings(data);
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save settings");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field name="companyName" label="Company Name" required defaultValue={settings?.companyName} />
      <Field name="address" label="Address" textarea defaultValue={settings?.address ?? ""} />
      <Field name="phone" label="Phone" defaultValue={settings?.phone ?? ""} />
      <Field name="email" label="Email" type="email" defaultValue={settings?.email ?? ""} />
      <Field name="taxNumber" label="Tax / VAT Number" defaultValue={settings?.taxNumber ?? ""} />

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Bank Details</p>
      <Field name="bankName" label="Bank Name" defaultValue={settings?.bankName ?? ""} />
      <Field name="bankAccountNumber" label="Account Number" defaultValue={settings?.bankAccountNumber ?? ""} />
      <Field name="bankBranch" label="Branch" defaultValue={settings?.bankBranch ?? ""} />

      <Field name="invoiceFooterNote" label="Invoice Footer Note" textarea defaultValue={settings?.invoiceFooterNote ?? ""} />

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Alert Thresholds</p>
      <Field name="defaultIdleWarnPct" label="Idle Warning Threshold (%)" type="number" defaultValue={settings?.defaultIdleWarnPct ?? "20"} />
      <Field name="defaultIdleCriticalPct" label="Idle Critical Threshold (%)" type="number" defaultValue={settings?.defaultIdleCriticalPct ?? "50"} />
      <Field name="defaultFuelVariancePct" label="Fuel Variance Threshold (%)" type="number" defaultValue={settings?.defaultFuelVariancePct ?? "20"} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Settings saved.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required,
  textarea,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  const base = "w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30";
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}{required && " *"}
      </label>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue} rows={3} className={base} />
      ) : (
        <input name={name} type={type} defaultValue={defaultValue} required={required} className={base} />
      )}
    </div>
  );
}
