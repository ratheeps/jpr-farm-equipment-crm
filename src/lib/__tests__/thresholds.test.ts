import { describe, it, expect } from "vitest";
import { resolveThreshold } from "../alerts/thresholds";

describe("resolveThreshold", () => {
  const companyDefaults = {
    defaultIdleWarnPct: "25",
    defaultIdleCriticalPct: "60",
    defaultFuelVariancePct: "30",
  };

  it("uses vehicle override when present", () => {
    const vehicle = { idleWarnPct: "15", idleCriticalPct: null, fuelVariancePct: null };
    expect(resolveThreshold(vehicle, companyDefaults, "idleWarnPct")).toBe(15);
  });

  it("falls back to company default when vehicle has null", () => {
    const vehicle = { idleWarnPct: null, idleCriticalPct: null, fuelVariancePct: null };
    expect(resolveThreshold(vehicle, companyDefaults, "idleWarnPct")).toBe(25);
  });

  it("falls back to hardcoded default when both null", () => {
    const vehicle = { idleWarnPct: null, idleCriticalPct: null, fuelVariancePct: null };
    const noCompanyDefaults = {
      defaultIdleWarnPct: null,
      defaultIdleCriticalPct: null,
      defaultFuelVariancePct: null,
    };
    expect(resolveThreshold(vehicle, noCompanyDefaults, "idleWarnPct")).toBe(20);
    expect(resolveThreshold(vehicle, noCompanyDefaults, "idleCriticalPct")).toBe(50);
    expect(resolveThreshold(vehicle, noCompanyDefaults, "fuelVariancePct")).toBe(20);
  });

  it("resolves all three fields correctly with full precedence", () => {
    const vehicle = { idleWarnPct: "10", idleCriticalPct: null, fuelVariancePct: "35" };
    expect(resolveThreshold(vehicle, companyDefaults, "idleWarnPct")).toBe(10);
    expect(resolveThreshold(vehicle, companyDefaults, "idleCriticalPct")).toBe(60);
    expect(resolveThreshold(vehicle, companyDefaults, "fuelVariancePct")).toBe(35);
  });
});
