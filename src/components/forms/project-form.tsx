"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createProject, updateProject } from "@/lib/actions/projects";

type ProjectStatus = "planned" | "active" | "completed" | "invoiced";

interface ProjectFormProps {
  locale: string;
  initial?: {
    id: string;
    name: string;
    clientName: string;
    clientPhone?: string | null;
    siteLocationText?: string | null;
    status: ProjectStatus;
    estimatedHours?: string | null;
    estimatedCost?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string | null;
  };
}

export function ProjectForm({ locale, initial }: ProjectFormProps) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    clientName: initial?.clientName ?? "",
    clientPhone: initial?.clientPhone ?? "",
    siteLocationText: initial?.siteLocationText ?? "",
    status: (initial?.status ?? "planned") as ProjectStatus,
    estimatedHours: initial?.estimatedHours ?? "",
    estimatedCost: initial?.estimatedCost ?? "",
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
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
        await updateProject(initial.id, form);
      } else {
        await createProject(form);
      }
      router.push(`/${locale}/admin/projects`);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  const statuses: ProjectStatus[] = ["planned", "active", "completed", "invoiced"];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      {/* Name */}
      <Field label={t("name")}>
        <Input
          value={form.name}
          onChange={(v) => set("name", v)}
          required
          placeholder={t("name")}
        />
      </Field>

      {/* Client Name */}
      <Field label={t("clientName")}>
        <Input
          value={form.clientName}
          onChange={(v) => set("clientName", v)}
          required
          placeholder={t("clientName")}
        />
      </Field>

      {/* Client Phone */}
      <Field label={t("clientPhone")}>
        <Input
          type="tel"
          value={form.clientPhone}
          onChange={(v) => set("clientPhone", v)}
          placeholder="07X XXX XXXX"
        />
      </Field>

      {/* Site Location */}
      <Field label={t("siteLocation")}>
        <Input
          value={form.siteLocationText}
          onChange={(v) => set("siteLocationText", v)}
          placeholder={t("siteLocation")}
        />
      </Field>

      {/* Status */}
      <Field label={tCommon("status")}>
        <div className="grid grid-cols-2 gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("status", s)}
              className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                form.status === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background text-foreground"
              }`}
            >
              {t(`statuses.${s}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </Field>

      {/* Start Date */}
      <Field label={t("startDate")}>
        <input
          type="date"
          value={form.startDate}
          onChange={(e) => set("startDate", e.target.value)}
          className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
        />
      </Field>

      {/* End Date */}
      <Field label={t("endDate")}>
        <input
          type="date"
          value={form.endDate}
          onChange={(e) => set("endDate", e.target.value)}
          className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
        />
      </Field>

      {/* Estimated Hours */}
      <Field label={t("estimatedHours")}>
        <Input
          type="number"
          value={form.estimatedHours}
          onChange={(v) => set("estimatedHours", v)}
          placeholder="0.0"
          step="0.1"
        />
      </Field>

      {/* Estimated Cost */}
      <Field label={t("estimatedCost")}>
        <Input
          type="number"
          value={form.estimatedCost}
          onChange={(v) => set("estimatedCost", v)}
          placeholder="0.00"
          step="0.01"
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
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
