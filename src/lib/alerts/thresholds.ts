const FIELD_MAP = {
  idleWarnPct: "defaultIdleWarnPct",
  idleCriticalPct: "defaultIdleCriticalPct",
  fuelVariancePct: "defaultFuelVariancePct",
} as const;

const HARDCODED_FALLBACK = {
  idleWarnPct: 20,
  idleCriticalPct: 50,
  fuelVariancePct: 20,
} as const;

type ThresholdField = keyof typeof FIELD_MAP;

export function resolveThreshold(
  vehicle: Record<string, unknown>,
  companyDefaults: Record<string, unknown>,
  field: ThresholdField
): number {
  const vehicleVal = vehicle[field];
  if (vehicleVal != null && vehicleVal !== "") return Number(vehicleVal);

  const companyKey = FIELD_MAP[field];
  const companyVal = companyDefaults[companyKey];
  if (companyVal != null && companyVal !== "") return Number(companyVal);

  return HARDCODED_FALLBACK[field];
}
