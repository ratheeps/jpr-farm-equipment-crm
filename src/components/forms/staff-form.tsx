"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createStaff, updateStaff } from "@/lib/actions/staff";

interface StaffFormProps {
  locale: string;
  initial?: {
    userId: string;
    phone: string;
    role: string;
    preferredLocale: string;
    fullName: string | null;
    staffPhone: string | null;
    nicNumber: string | null;
    payRate: string | null;
    payType: string | null;
  };
}

export function StaffForm({ locale, initial }: StaffFormProps) {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [form, setForm] = useState({
    phone: initial?.phone ?? "",
    password: "",
    role: initial?.role ?? "operator",
    preferredLocale: initial?.preferredLocale ?? "ta",
    fullName: initial?.fullName ?? "",
    staffPhone: initial?.staffPhone ?? "",
    nicNumber: initial?.nicNumber ?? "",
    payRate: initial?.payRate ?? "",
    payType: initial?.payType ?? "daily",
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
      if (initial?.userId) {
        await updateStaff(initial.userId, form);
      } else {
        await createStaff(form);
      }
      router.push(`/${locale}/admin/staff`);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  const roles = ["super_admin", "admin", "operator", "auditor"];
  const payTypes = ["hourly", "daily", "monthly", "per_acre"];
  const locales = [
    { code: "ta", label: "தமிழ்" },
    { code: "si", label: "සිංහල" },
    { code: "en", label: "English" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      <Field label={t("fullName")}>
        <input
          type="text"
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          required
          className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
        />
      </Field>

      <Field label={t("phone")}>
        <input
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          required
          className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
        />
      </Field>

      {!initial && (
        <Field label={tCommon("name") + " (Password)"}>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            required={!initial}
            placeholder="Minimum 8 characters"
            className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
          />
        </Field>
      )}

      <Field label={t("nic")}>
        <input
          type="text"
          value={form.nicNumber}
          onChange={(e) => set("nicNumber", e.target.value)}
          className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
        />
      </Field>

      <Field label={t("role")}>
        <div className="grid grid-cols-2 gap-2">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => set("role", r)}
              className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                form.role === r
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background text-foreground"
              }`}
            >
              {t(`roles.${r}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Language / மொழி / භාෂාව">
        <div className="flex gap-2">
          {locales.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => set("preferredLocale", l.code)}
              className={`flex-1 h-11 rounded-lg border text-sm font-medium transition-colors ${
                form.preferredLocale === l.code
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("payType")}>
        <div className="grid grid-cols-2 gap-2">
          {payTypes.map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => set("payType", pt)}
              className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                form.payType === pt
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background text-foreground"
              }`}
            >
              {t(`payTypes.${pt}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("payRate")}>
        <input
          type="number"
          inputMode="decimal"
          value={form.payRate}
          onChange={(e) => set("payRate", e.target.value)}
          placeholder="0.00"
          step="0.01"
          className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
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
