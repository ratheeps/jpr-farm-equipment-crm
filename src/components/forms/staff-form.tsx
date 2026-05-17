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

type ErrorMap = Record<string, string>;

export function StaffForm({ locale, initial }: StaffFormProps) {
  const t = useTranslations("staff");
  const tErr = useTranslations("staff.errors");
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
  const [errors, setErrors] = useState<ErrorMap>({});
  const [formError, setFormError] = useState("");

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validateClient(): ErrorMap {
    const next: ErrorMap = {};
    if (!form.fullName.trim()) next.fullName = "fullNameRequired";
    if (!form.phone.trim()) next.phone = "phoneRequired";
    else if (!/^\d{10}$/.test(form.phone.trim())) next.phone = "phoneInvalid";
    if (!initial) {
      if (!form.password) next.password = "passwordRequired";
      else if (form.password.length < 6) next.password = "passwordTooShort";
    }
    if (!form.role) next.role = "roleRequired";
    if (!form.payType) next.payType = "payTypeRequired";
    if (form.payRate.trim() !== "") {
      const n = Number(form.payRate);
      if (Number.isNaN(n) || n < 0) next.payRate = "payRateInvalid";
    }
    return next;
  }

  function errMsg(key: string | undefined): string {
    if (!key) return "";
    return tErr(key as Parameters<typeof tErr>[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const result = initial?.userId
        ? await updateStaff(initial.userId, form)
        : await createStaff(form);

      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        if (result.formError) setFormError(errMsg(result.formError));
        return;
      }
      router.push(`/${locale}/admin/staff`);
    } catch (e) {
      console.error("[staff-form] submit failed:", e);
      setFormError(tCommon("error"));
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
    <form onSubmit={handleSubmit} noValidate className="space-y-5 pb-8">
      <Field label={t("fullName")} error={errMsg(errors.fullName)}>
        <input
          type="text"
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          aria-invalid={!!errors.fullName}
          className={inputCls(!!errors.fullName)}
        />
      </Field>

      <Field label={t("phone")} error={errMsg(errors.phone)}>
        <input
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          aria-invalid={!!errors.phone}
          className={inputCls(!!errors.phone)}
        />
      </Field>

      {!initial && (
        <Field
          label={tCommon("name") + " (Password)"}
          error={errMsg(errors.password)}
        >
          <input
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="Minimum 6 characters"
            aria-invalid={!!errors.password}
            className={inputCls(!!errors.password)}
          />
        </Field>
      )}

      <Field label={t("nic")} error={errMsg(errors.nicNumber)}>
        <input
          type="text"
          value={form.nicNumber}
          onChange={(e) => set("nicNumber", e.target.value)}
          aria-invalid={!!errors.nicNumber}
          className={inputCls(!!errors.nicNumber)}
        />
      </Field>

      <Field label={t("role")} error={errMsg(errors.role)}>
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

      <Field label={t("payType")} error={errMsg(errors.payType)}>
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

      <Field label={t("payRate")} error={errMsg(errors.payRate)}>
        <input
          type="number"
          inputMode="decimal"
          value={form.payRate}
          onChange={(e) => set("payRate", e.target.value)}
          placeholder="0.00"
          step="0.01"
          aria-invalid={!!errors.payRate}
          className={inputCls(!!errors.payRate)}
        />
      </Field>

      {formError && (
        <p className="text-destructive text-sm text-center">{formError}</p>
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

function inputCls(invalid: boolean): string {
  return `w-full h-12 px-4 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 text-base ${
    invalid
      ? "border-destructive focus:ring-destructive"
      : "border-input focus:ring-ring"
  }`;
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
