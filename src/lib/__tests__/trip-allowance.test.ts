import { describe, it, expect } from "vitest";
import { computePayBreakdown, type PayrollInput, type PayrollLog } from "@/lib/payroll-calc";

const makeLog = (overrides: Partial<PayrollLog> = {}): PayrollLog => ({
  startEngineHours: "100",
  endEngineHours: "108",
  acresWorked: null,
  kmTraveled: null,
  tripAllowanceOverride: null,
  vehicle: {
    vehicleId: "v1",
    billingModel: "hourly",
    operatorRatePerUnit: null,
    tripAllowance: "500",
  },
  ...overrides,
});

describe("trip allowance calculation", () => {
  it("uses vehicle tripAllowance when no override", () => {
    const input: PayrollInput = {
      payType: "daily", payRate: 3000,
      logs: [makeLog()], logDays: 1, leaveDays: 0, periodDays: 30,
    };
    const result = computePayBreakdown(input);
    expect(result.tripAllowanceTotal).toBe(500);
  });

  it("override takes precedence over vehicle default (Spec §2.3)", () => {
    const input: PayrollInput = {
      payType: "daily", payRate: 3000,
      logs: [makeLog({ tripAllowanceOverride: "750" })],
      logDays: 1, leaveDays: 0, periodDays: 30,
    };
    const result = computePayBreakdown(input);
    expect(result.tripAllowanceTotal).toBe(750);
  });

  it("sums trip allowance across multiple logs", () => {
    const input: PayrollInput = {
      payType: "daily", payRate: 3000,
      logs: [
        makeLog({ vehicle: { ...makeLog().vehicle, tripAllowance: "500" } }),
        makeLog({ tripAllowanceOverride: "600" }),
      ],
      logDays: 2, leaveDays: 0, periodDays: 30,
    };
    const result = computePayBreakdown(input);
    expect(result.tripAllowanceTotal).toBe(1100);
  });

  it("zero when no allowance configured and no override", () => {
    const log = makeLog({
      vehicle: { vehicleId: "v1", billingModel: "hourly", operatorRatePerUnit: null, tripAllowance: null },
    });
    const input: PayrollInput = {
      payType: "daily", payRate: 3000,
      logs: [log], logDays: 1, leaveDays: 0, periodDays: 30,
    };
    const result = computePayBreakdown(input);
    expect(result.tripAllowanceTotal).toBe(0);
  });
});
