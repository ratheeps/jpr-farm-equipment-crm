import { describe, it, expect } from "vitest";
import { isLoginDisabled } from "@/lib/auth/system-user";

describe("system user login rejection", () => {
  it("rejects system@internal regardless of password hash", () => {
    expect(isLoginDisabled({ phone: "system@internal", passwordHash: "x" })).toBe(true);
  });
  it("rejects any user whose hash is the disabled sentinel", () => {
    expect(isLoginDisabled({ phone: "0770000001", passwordHash: "!disabled" })).toBe(true);
  });
  it("allows real users", () => {
    expect(isLoginDisabled({ phone: "0770000001", passwordHash: "$2b$10$abc" })).toBe(false);
  });
});
