import { describe, it, expect } from "vitest";

// Pure function extracted from generatePayroll for testability
import { computePayBreakdown } from "../payroll-calc";

describe("computePayBreakdown", () => {
  const baseLog = {
    startEngineHours: "100",
    endEngineHours: "108",
    acresWorked: "5",
    kmTraveled: "120",
    fuelUsedLiters: "40",
    tripAllowanceOverride: null as string | null,
  };

  describe("basePay calculation", () => {
    it("hourly: payRate × totalHours", () => {
      const result = computePayBreakdown({
        payType: "hourly",
        payRate: 500,
        logs: [{ ...baseLog, vehicle: { billingModel: "hourly", operatorRatePerUnit: null, tripAllowance: null } }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.basePay).toBe(4000); // 8 hours × 500
    });

    it("daily: payRate × (logDays − leaveDays)", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{ ...baseLog, vehicle: { billingModel: "hourly", operatorRatePerUnit: null, tripAllowance: null } }],
        logDays: 20,
        leaveDays: 3,
        periodDays: 30,
      });
      expect(result.basePay).toBe(34000); // 17 × 2000
    });

    it("monthly: prorates for unpaid leave days", () => {
      const result = computePayBreakdown({
        payType: "monthly",
        payRate: 60000,
        logs: [],
        logDays: 0,
        leaveDays: 6,
        periodDays: 30,
      });
      expect(result.basePay).toBe(48000); // 60000 × (30 − 6) / 30
    });

    it("monthly: no deduction for zero leave days", () => {
      const result = computePayBreakdown({
        payType: "monthly",
        payRate: 60000,
        logs: [],
        logDays: 0,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.basePay).toBe(60000);
    });

    it("per_acre: basePay is 0 (bonus via perUnitBonusTotal)", () => {
      const result = computePayBreakdown({
        payType: "per_acre",
        payRate: 300,
        logs: [{ ...baseLog, vehicle: { billingModel: "per_acre", operatorRatePerUnit: null, tripAllowance: null } }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.basePay).toBe(0);
      // per_acre staff: payRate × acres goes to performanceBonus (legacy)
    });
  });

  describe("perUnitBonusTotal", () => {
    it("hourly vehicle: operatorRatePerUnit × hours worked per log", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{
          ...baseLog,
          vehicle: { billingModel: "hourly", operatorRatePerUnit: "100", tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(800); // 8 hours × 100
    });

    it("per_acre vehicle: operatorRatePerUnit × acresWorked", () => {
      const result = computePayBreakdown({
        payType: "monthly",
        payRate: 30000,
        logs: [{
          ...baseLog,
          acresWorked: "12",
          vehicle: { billingModel: "per_acre", operatorRatePerUnit: "250", tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(3000); // 12 acres × 250
    });

    it("per_km vehicle: operatorRatePerUnit × kmTraveled", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 1500,
        logs: [{
          ...baseLog,
          kmTraveled: "200",
          vehicle: { billingModel: "per_km", operatorRatePerUnit: "15", tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(3000); // 200 km × 15
    });

    it("per_task vehicle: operatorRatePerUnit × 1 per completed log", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 1500,
        logs: [
          { ...baseLog, vehicle: { billingModel: "per_task", operatorRatePerUnit: "500", tripAllowance: null } },
          { ...baseLog, vehicle: { billingModel: "per_task", operatorRatePerUnit: "500", tripAllowance: null } },
        ],
        logDays: 2,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(1000); // 2 tasks × 500
    });

    it("null operatorRatePerUnit contributes 0", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{
          ...baseLog,
          vehicle: { billingModel: "hourly", operatorRatePerUnit: null, tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(0);
    });

    it("multiple logs with different vehicles sum correctly", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [
          { ...baseLog, vehicle: { billingModel: "hourly", operatorRatePerUnit: "100", tripAllowance: null } },
          { ...baseLog, acresWorked: "10", vehicle: { billingModel: "per_acre", operatorRatePerUnit: "200", tripAllowance: null } },
        ],
        logDays: 2,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.perUnitBonusTotal).toBe(2800); // (8×100) + (10×200)
    });
  });

  describe("tripAllowanceTotal", () => {
    it("uses log override when present", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{
          ...baseLog,
          tripAllowanceOverride: "750",
          vehicle: { billingModel: "per_km", operatorRatePerUnit: null, tripAllowance: "500" },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.tripAllowanceTotal).toBe(750);
    });

    it("falls back to vehicle default when no override", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{
          ...baseLog,
          tripAllowanceOverride: null,
          vehicle: { billingModel: "per_km", operatorRatePerUnit: null, tripAllowance: "500" },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.tripAllowanceTotal).toBe(500);
    });

    it("zero when no override and no vehicle default", () => {
      const result = computePayBreakdown({
        payType: "daily",
        payRate: 2000,
        logs: [{
          ...baseLog,
          tripAllowanceOverride: null,
          vehicle: { billingModel: "hourly", operatorRatePerUnit: null, tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.tripAllowanceTotal).toBe(0);
    });
  });

  describe("gross + net", () => {
    it("harvester dual-pay: monthly base + per-acre bonus", () => {
      const result = computePayBreakdown({
        payType: "monthly",
        payRate: 30000,
        logs: [{
          ...baseLog,
          acresWorked: "20",
          vehicle: { billingModel: "per_acre", operatorRatePerUnit: "300", tripAllowance: null },
        }],
        logDays: 1,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.basePay).toBe(30000);
      expect(result.perUnitBonusTotal).toBe(6000);
      expect(result.tripAllowanceTotal).toBe(0);
      expect(result.gross).toBe(36000);
    });

    it("zero logs → basePay only (no bonuses)", () => {
      const result = computePayBreakdown({
        payType: "monthly",
        payRate: 50000,
        logs: [],
        logDays: 0,
        leaveDays: 0,
        periodDays: 30,
      });
      expect(result.basePay).toBe(50000);
      expect(result.perUnitBonusTotal).toBe(0);
      expect(result.tripAllowanceTotal).toBe(0);
      expect(result.gross).toBe(50000);
    });
  });
});
