"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createVehicle, updateVehicle } from "@/lib/actions/vehicles";

type VehicleType =
  | "bulldozer"
  | "excavator"
  | "harvester"
  | "transport_truck"
  | "tractor";
type BillingModel = "hourly" | "per_acre" | "per_km" | "per_task";

interface VehicleFormProps {
  locale: string;
  initial?: {
    id: string;
    name: string;
    registrationNumber?: string | null;
    vehicleType: VehicleType;
    billingModel: BillingModel;
    ratePerHour?: string | null;
    ratePerAcre?: string | null;
    ratePerKm?: string | null;
    ratePerTask?: string | null;
    operatorRatePerUnit?: string | null;
    tripAllowance?: string | null;
    fuelConsumptionBaseline?: string | null;
    maintenanceIntervalHours?: number | null;
    currentEngineHours?: string | null;
    status: string;
    notes?: string | null;
    idleWarnPct?: string | null;
    idleCriticalPct?: string | null;
    fuelVariancePct?: string | null;
  };
}

export function VehicleForm({ locale, initial }: VehicleFormProps) {
  const t = useTranslations("vehicles");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    registrationNumber: initial?.registrationNumber ?? "",
    vehicleType: (initial?.vehicleType ?? "bulldozer") as VehicleType,
    billingModel: (initial?.billingModel ?? "hourly") as BillingModel,
    ratePerHour: initial?.ratePerHour ?? "",
    ratePerAcre: initial?.ratePerAcre ?? "",
    ratePerKm: initial?.ratePerKm ?? "",
    ratePerTask: initial?.ratePerTask ?? "",
    operatorRatePerUnit: initial?.operatorRatePerUnit ?? "",
    tripAllowance: initial?.tripAllowance ?? "",
    fuelConsumptionBaseline: initial?.fuelConsumptionBaseline ?? "",
    maintenanceIntervalHours: initial?.maintenanceIntervalHours ?? 250,
    currentEngineHours: initial?.currentEngineHours ?? "0",
    status: initial?.status ?? "active",
    notes: initial?.notes ?? "",
    idleWarnPct: initial?.idleWarnPct ?? "",
    idleCriticalPct: initial?.idleCriticalPct ?? "",
    fuelVariancePct: initial?.fuelVariancePct ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (initial?.id) {
        await updateVehicle(initial.id, form);
      } else {
        await createVehicle(form);
      }
      router.push(`/${locale}/admin/vehicles`);
    } catch (err) {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  const vehicleTypes: VehicleType[] = [
    "bulldozer",
    "excavator",
    "harvester",
    "transport_truck",
    "tractor",
  ];
  const billingModels: BillingModel[] = [
    "hourly",
    "per_acre",
    "per_km",
    "per_task",
  ];

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

      {/* Registration */}
      <Field label={t("registration")}>
        <Input
          value={form.registrationNumber}
          onChange={(v) => set("registrationNumber", v)}
          placeholder="ABC-1234"
        />
      </Field>

      {/* Vehicle Type */}
      <Field label={t("type")}>
        <select
          value={form.vehicleType}
          onChange={(e) => set("vehicleType", e.target.value)}
          className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
        >
          {vehicleTypes.map((vt) => (
            <option key={vt} value={vt}>
              {t(`types.${vt}` as Parameters<typeof t>[0])}
            </option>
          ))}
        </select>
      </Field>

      {/* Billing Model */}
      <Field label={t("billingModel")}>
        <div className="grid grid-cols-2 gap-2">
          {billingModels.map((bm) => (
            <button
              key={bm}
              type="button"
              onClick={() => set("billingModel", bm)}
              className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                form.billingModel === bm
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input bg-background text-foreground"
              }`}
            >
              {t(`billing.${bm}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </Field>

      {/* Rate — show the relevant field based on billing model */}
      {form.billingModel === "hourly" && (
        <Field label={t("ratePerHour")}>
          <Input
            type="number"
            value={form.ratePerHour}
            onChange={(v) => set("ratePerHour", v)}
            placeholder="0.00"
            step="0.01"
          />
        </Field>
      )}
      {form.billingModel === "per_acre" && (
        <Field label={t("ratePerAcre")}>
          <Input
            type="number"
            value={form.ratePerAcre}
            onChange={(v) => set("ratePerAcre", v)}
            placeholder="0.00"
            step="0.01"
          />
        </Field>
      )}
      {form.billingModel === "per_km" && (
        <Field label={t("ratePerKm")}>
          <Input
            type="number"
            value={form.ratePerKm}
            onChange={(v) => set("ratePerKm", v)}
            placeholder="0.00"
            step="0.01"
          />
        </Field>
      )}
      {form.billingModel === "per_task" && (
        <Field label={t("ratePerTask")}>
          <Input
            type="number"
            value={form.ratePerTask}
            onChange={(v) => set("ratePerTask", v)}
            placeholder="0.00"
            step="0.01"
          />
        </Field>
      )}

      {/* Operator Rate Per Unit — label changes based on billing model */}
      <Field label={t(`operatorRatePer${form.billingModel === "hourly" ? "Hour" : form.billingModel === "per_acre" ? "Acre" : form.billingModel === "per_km" ? "Km" : "Task"}` as Parameters<typeof t>[0])}>
        <Input
          type="number"
          value={form.operatorRatePerUnit}
          onChange={(v) => set("operatorRatePerUnit", v)}
          placeholder="0.00"
          step="0.01"
        />
      </Field>

      {/* Trip Allowance — only for transport trucks */}
      {form.vehicleType === "transport_truck" && (
        <Field label={t("tripAllowance")}>
          <Input
            type="number"
            value={form.tripAllowance}
            onChange={(v) => set("tripAllowance", v)}
            placeholder="0.00"
            step="0.01"
          />
        </Field>
      )}

      {/* Fuel baseline */}
      <Field label={t("fuelBaseline")}>
        <Input
          type="number"
          value={form.fuelConsumptionBaseline}
          onChange={(v) => set("fuelConsumptionBaseline", v)}
          placeholder="0.0"
          step="0.1"
        />
      </Field>

      {/* Maintenance interval */}
      <Field label={t("maintenanceInterval")}>
        <Input
          type="number"
          value={String(form.maintenanceIntervalHours)}
          onChange={(v) => set("maintenanceIntervalHours", Number(v))}
          placeholder="250"
        />
      </Field>

      {/* Current engine hours */}
      <Field label={t("engineHours")}>
        <Input
          type="number"
          value={form.currentEngineHours}
          onChange={(v) => set("currentEngineHours", v)}
          placeholder="0"
          step="0.1"
        />
      </Field>

      {/* Status */}
      <Field label={tCommon("status")}>
        <select
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
          className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
        >
          <option value="active">{t("statuses.active")}</option>
          <option value="inactive">{t("statuses.inactive")}</option>
          <option value="maintenance">{t("statuses.maintenance")}</option>
        </select>
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

      {/* Alert Thresholds (optional) */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Alert Thresholds (optional)</p>
      <Field label="Idle Warning Threshold (%)">
        <Input
          type="number"
          value={form.idleWarnPct}
          onChange={(v) => set("idleWarnPct", v)}
          placeholder="Company default"
          step="0.1"
        />
      </Field>
      <Field label="Idle Critical Threshold (%)">
        <Input
          type="number"
          value={form.idleCriticalPct}
          onChange={(v) => set("idleCriticalPct", v)}
          placeholder="Company default"
          step="0.1"
        />
      </Field>
      <Field label="Fuel Variance Threshold (%)">
        <Input
          type="number"
          value={form.fuelVariancePct}
          onChange={(v) => set("fuelVariancePct", v)}
          placeholder="Company default"
          step="0.1"
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
      inputMode={type === "number" ? "decimal" : undefined}
      className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
    />
  );
}
