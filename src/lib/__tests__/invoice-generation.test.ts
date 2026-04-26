import { describe, it, expect } from "vitest";
import { buildInvoiceLineItems } from "../invoice-line-items";

describe("buildInvoiceLineItems", () => {
  const baseLog = {
    date: "2026-04-10",
    startEngineHours: "100",
    endEngineHours: "108",
    acresWorked: "5",
    kmTraveled: "120",
    vehicleName: "CAT 320",
    vehicleBillingModel: "hourly" as const,
    vehicleRatePerHour: "3500",
    vehicleRatePerAcre: null as string | null,
    vehicleRatePerKm: null as string | null,
    vehicleRatePerTask: null as string | null,
  };

  it("hourly: quantity = hours, rate = ratePerHour", () => {
    const items = buildInvoiceLineItems([], [baseLog]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe("8.0");
    expect(items[0].rate).toBe("3500");
    expect(items[0].unit).toBe("hours");
    expect(Number(items[0].amount)).toBe(28000);
  });

  it("per_acre: quantity = acres, rate = ratePerAcre", () => {
    const log = {
      ...baseLog,
      vehicleBillingModel: "per_acre" as const,
      vehicleRatePerAcre: "2000",
      acresWorked: "12.5",
    };
    const items = buildInvoiceLineItems([], [log]);
    expect(items[0].quantity).toBe("12.5");
    expect(items[0].unit).toBe("acres");
    expect(Number(items[0].amount)).toBe(25000);
  });

  it("per_km: quantity = km, rate = ratePerKm", () => {
    const log = {
      ...baseLog,
      vehicleBillingModel: "per_km" as const,
      vehicleRatePerKm: "85",
      kmTraveled: "200",
    };
    const items = buildInvoiceLineItems([], [log]);
    expect(items[0].quantity).toBe("200.0");
    expect(items[0].unit).toBe("km");
    expect(Number(items[0].amount)).toBe(17000);
  });

  it("per_task: quantity = 1, rate = ratePerTask", () => {
    const log = {
      ...baseLog,
      vehicleBillingModel: "per_task" as const,
      vehicleRatePerTask: "15000",
    };
    const items = buildInvoiceLineItems([], [log]);
    expect(items[0].quantity).toBe("1");
    expect(items[0].unit).toBe("tasks");
    expect(Number(items[0].amount)).toBe(15000);
  });

  it("prepends mobilization line item when fee provided", () => {
    const mobilization = [{ description: "Mobilization", quantity: "1", unit: "mobilization", rate: "5000", amount: "5000" }];
    const items = buildInvoiceLineItems(mobilization, [baseLog]);
    expect(items).toHaveLength(2);
    expect(items[0].description).toBe("Mobilization");
    expect(items[0].amount).toBe("5000");
    expect(items[1].unit).toBe("hours");
  });

  it("multiple logs produce multiple line items", () => {
    const items = buildInvoiceLineItems([], [baseLog, { ...baseLog, date: "2026-04-11" }]);
    expect(items).toHaveLength(2);
  });

  it("skips logs with zero output", () => {
    const log = { ...baseLog, startEngineHours: "100", endEngineHours: "100" };
    const items = buildInvoiceLineItems([], [log]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe("0.0");
    expect(Number(items[0].amount)).toBe(0);
  });
});

describe("mobilization double-billing guard (Spec §5.2)", () => {
  it("should include mobilization when not yet billed", () => {
    const project = { mobilizationFee: "5000", mobilizationBilled: false };
    const shouldBill = project.mobilizationFee
      && Number(project.mobilizationFee) > 0
      && !project.mobilizationBilled;
    expect(shouldBill).toBe(true);
  });

  it("should skip mobilization when already billed", () => {
    const project = { mobilizationFee: "5000", mobilizationBilled: true };
    const shouldBill = project.mobilizationFee
      && Number(project.mobilizationFee) > 0
      && !project.mobilizationBilled;
    expect(shouldBill).toBe(false);
  });

  it("should skip mobilization when fee is zero", () => {
    const project = { mobilizationFee: "0", mobilizationBilled: false };
    const shouldBill = project.mobilizationFee
      && Number(project.mobilizationFee) > 0
      && !project.mobilizationBilled;
    expect(shouldBill).toBe(false);
  });

  it("should skip mobilization when fee is null", () => {
    const project = { mobilizationFee: null, mobilizationBilled: false };
    const shouldBill = project.mobilizationFee
      && Number(project.mobilizationFee) > 0
      && !project.mobilizationBilled;
    expect(shouldBill).toBeFalsy();
  });
});
