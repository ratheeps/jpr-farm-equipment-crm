import { describe, it, expect } from "vitest";
import {
  ValidationError,
  assertString,
  assertOptionalString,
  assertNumericString,
  assertOptionalNumericString,
  assertUUID,
  assertOptionalUUID,
  assertDate,
  assertEnum,
  validateStartLog,
  validateEndLog,
} from "../validations";

describe("assertString", () => {
  it("returns trimmed string for valid input", () => {
    expect(assertString("  hello  ", "field")).toBe("hello");
  });

  it("throws ValidationError for empty string", () => {
    expect(() => assertString("", "field")).toThrow(ValidationError);
  });

  it("throws ValidationError for non-string", () => {
    expect(() => assertString(null, "field")).toThrow(ValidationError);
    expect(() => assertString(undefined, "field")).toThrow(ValidationError);
    expect(() => assertString(123, "field")).toThrow(ValidationError);
  });
});

describe("assertOptionalString", () => {
  it("returns undefined for empty/null/undefined", () => {
    expect(assertOptionalString(null)).toBeUndefined();
    expect(assertOptionalString(undefined)).toBeUndefined();
    expect(assertOptionalString("")).toBeUndefined();
    expect(assertOptionalString("   ")).toBeUndefined();
  });

  it("returns trimmed string for valid input", () => {
    expect(assertOptionalString("  hello  ")).toBe("hello");
  });
});

describe("assertNumericString", () => {
  it("accepts valid non-negative numbers", () => {
    expect(assertNumericString("0", "f")).toBe("0");
    expect(assertNumericString("123.5", "f")).toBe("123.5");
  });

  it("throws for negative numbers", () => {
    expect(() => assertNumericString("-1", "f")).toThrow(ValidationError);
  });

  it("throws for non-numeric strings", () => {
    expect(() => assertNumericString("abc", "f")).toThrow(ValidationError);
  });

  it("throws for empty string", () => {
    expect(() => assertNumericString("", "f")).toThrow(ValidationError);
  });
});

describe("assertOptionalNumericString", () => {
  it("returns undefined for empty/null/undefined", () => {
    expect(assertOptionalNumericString(null)).toBeUndefined();
    expect(assertOptionalNumericString("")).toBeUndefined();
  });

  it("returns undefined for negative numbers", () => {
    expect(assertOptionalNumericString("-5")).toBeUndefined();
  });

  it("returns numeric string for valid input", () => {
    expect(assertOptionalNumericString("12.5")).toBe("12.5");
  });
});

describe("assertUUID", () => {
  const validUUID = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts a valid UUID", () => {
    expect(assertUUID(validUUID, "id")).toBe(validUUID);
  });

  it("throws for invalid UUID", () => {
    expect(() => assertUUID("not-a-uuid", "id")).toThrow(ValidationError);
    expect(() => assertUUID("", "id")).toThrow(ValidationError);
  });
});

describe("assertOptionalUUID", () => {
  const validUUID = "123e4567-e89b-12d3-a456-426614174000";

  it("returns valid UUID", () => {
    expect(assertOptionalUUID(validUUID)).toBe(validUUID);
  });

  it("returns undefined for empty/invalid", () => {
    expect(assertOptionalUUID("")).toBeUndefined();
    expect(assertOptionalUUID(null)).toBeUndefined();
    expect(assertOptionalUUID("not-a-uuid")).toBeUndefined();
  });
});

describe("assertDate", () => {
  it("accepts valid date strings", () => {
    expect(assertDate("2024-01-15", "date")).toBe("2024-01-15");
  });

  it("throws for invalid date format", () => {
    expect(() => assertDate("2024/01/15", "date")).toThrow(ValidationError);
    expect(() => assertDate("15-01-2024", "date")).toThrow(ValidationError);
    expect(() => assertDate("", "date")).toThrow(ValidationError);
  });
});

describe("assertEnum", () => {
  const options = ["a", "b", "c"] as const;

  it("accepts valid enum values", () => {
    expect(assertEnum("a", "field", options)).toBe("a");
  });

  it("throws for values not in enum", () => {
    expect(() => assertEnum("d", "field", options)).toThrow(ValidationError);
    expect(() => assertEnum("", "field", options)).toThrow(ValidationError);
  });
});

describe("validateStartLog", () => {
  const vehicleId = "123e4567-e89b-12d3-a456-426614174000";

  it("validates correct inputs", () => {
    const result = validateStartLog({
      vehicleId,
      startEngineHours: "100",
    });
    expect(result.vehicleId).toBe(vehicleId);
    expect(result.startEngineHours).toBe("100");
    expect(result.projectId).toBeUndefined();
  });

  it("throws when vehicleId is missing", () => {
    expect(() =>
      validateStartLog({ vehicleId: "", startEngineHours: "100" })
    ).toThrow(ValidationError);
  });

  it("throws when startEngineHours is negative", () => {
    expect(() =>
      validateStartLog({ vehicleId, startEngineHours: "-5" })
    ).toThrow(ValidationError);
  });
});

describe("validateEndLog", () => {
  it("validates correct inputs", () => {
    const result = validateEndLog({
      endEngineHours: "150",
      fuelUsedLiters: "20",
    });
    expect(result.endEngineHours).toBe("150");
    expect(result.fuelUsedLiters).toBe("20");
  });

  it("throws when endEngineHours is missing", () => {
    expect(() => validateEndLog({ endEngineHours: "" })).toThrow(ValidationError);
  });

  it("ignores negative optional fuel values", () => {
    const result = validateEndLog({ endEngineHours: "100", fuelUsedLiters: "-1" });
    expect(result.fuelUsedLiters).toBeUndefined();
  });
});
