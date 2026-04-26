import { describe, it, expect } from "vitest";

describe("updateLogByAdmin field whitelist", () => {
  const WHITELIST = ["fuelUsedLiters", "kmTraveled", "acresWorked", "notes"];

  function stripNonWhitelist(patch: Record<string, unknown>) {
    const safe: Record<string, unknown> = {};
    for (const field of WHITELIST) {
      if (field in patch) safe[field] = patch[field];
    }
    return safe;
  }

  it("keeps whitelisted fields", () => {
    const result = stripNonWhitelist({
      fuelUsedLiters: "50",
      notes: "corrected",
    });
    expect(result).toEqual({ fuelUsedLiters: "50", notes: "corrected" });
  });

  it("strips non-whitelisted fields", () => {
    const result = stripNonWhitelist({
      fuelUsedLiters: "50",
      startEngineHours: "999",
      vehicleId: "hacked-id",
      operatorId: "hacked-id",
    });
    expect(result).toEqual({ fuelUsedLiters: "50" });
    expect(result).not.toHaveProperty("startEngineHours");
    expect(result).not.toHaveProperty("vehicleId");
    expect(result).not.toHaveProperty("operatorId");
  });

  it("returns empty for entirely non-whitelisted input", () => {
    const result = stripNonWhitelist({
      startEngineHours: "999",
      endEngineHours: "1000",
    });
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe("payroll guard — reset to draft on log edit (Spec §4.1)", () => {
  function shouldResetPayroll(logDate: string, payrolls: { periodStart: string; periodEnd: string; status: string }[]) {
    return payrolls.filter(
      (pp) => (pp.status === "finalized" || pp.status === "paid")
        && logDate >= pp.periodStart && logDate <= pp.periodEnd
    );
  }

  it("resets finalized payroll when edited log is in range", () => {
    const affected = shouldResetPayroll("2026-04-10", [
      { periodStart: "2026-04-01", periodEnd: "2026-04-15", status: "finalized" },
    ]);
    expect(affected).toHaveLength(1);
  });

  it("does not reset draft payroll", () => {
    const affected = shouldResetPayroll("2026-04-10", [
      { periodStart: "2026-04-01", periodEnd: "2026-04-15", status: "draft" },
    ]);
    expect(affected).toHaveLength(0);
  });

  it("does not reset payroll outside date range", () => {
    const affected = shouldResetPayroll("2026-04-20", [
      { periodStart: "2026-04-01", periodEnd: "2026-04-15", status: "paid" },
    ]);
    expect(affected).toHaveLength(0);
  });
});
