"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createFarm, updateFarm } from "@/lib/actions/farms";

interface FarmFormProps {
  locale: string;
  initial?: {
    id: string;
    name: string;
    areaAcres: string;
    locationText?: string | null;
    gpsLat?: string | null;
    gpsLng?: string | null;
    soilType?: string | null;
    waterSource?: string | null;
    isActive: boolean;
  };
}

export function FarmForm({ locale, initial }: FarmFormProps) {
  const t = useTranslations("farms");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    areaAcres: initial?.areaAcres ?? "",
    locationText: initial?.locationText ?? "",
    gpsLat: initial?.gpsLat ?? "",
    gpsLng: initial?.gpsLng ?? "",
    soilType: initial?.soilType ?? "",
    waterSource: initial?.waterSource ?? "",
    isActive: initial?.isActive ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (initial?.id) {
        await updateFarm(initial.id, form);
      } else {
        await createFarm(form);
      }
      router.push(`/${locale}/admin/farms`);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

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

      {/* Area */}
      <Field label={t("areaAcres")}>
        <Input
          type="number"
          value={form.areaAcres}
          onChange={(v) => set("areaAcres", v)}
          required
          placeholder="0.00"
          step="0.01"
        />
      </Field>

      {/* Location */}
      <Field label={t("location")}>
        <Input
          value={form.locationText}
          onChange={(v) => set("locationText", v)}
          placeholder={t("location")}
        />
      </Field>

      {/* GPS */}
      <Field label={t("gpsCoords")}>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            value={form.gpsLat}
            onChange={(v) => set("gpsLat", v)}
            placeholder="Latitude"
            step="0.0000001"
          />
          <Input
            type="number"
            value={form.gpsLng}
            onChange={(v) => set("gpsLng", v)}
            placeholder="Longitude"
            step="0.0000001"
          />
        </div>
      </Field>

      {/* Soil Type */}
      <Field label={t("soilType")}>
        <Input
          value={form.soilType}
          onChange={(v) => set("soilType", v)}
          placeholder={t("soilType")}
        />
      </Field>

      {/* Water Source */}
      <Field label={t("waterSource")}>
        <Input
          value={form.waterSource}
          onChange={(v) => set("waterSource", v)}
          placeholder={t("waterSource")}
        />
      </Field>

      {/* Active Status (edit mode only) */}
      {initial && (
        <Field label={tCommon("status")}>
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => set("isActive", val)}
                className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                  form.isActive === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input bg-background text-foreground"
                }`}
              >
                {val ? tCommon("active") : tCommon("inactive")}
              </button>
            ))}
          </div>
        </Field>
      )}

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
      inputMode={type === "number" ? "decimal" : undefined}
      className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
    />
  );
}
