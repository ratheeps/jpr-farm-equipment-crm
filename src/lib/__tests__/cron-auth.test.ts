import { describe, it, expect } from "vitest";

function validateCronAuth(authHeader: string | null, expectedSecret: string): boolean {
  if (!authHeader) return false;
  const parts = authHeader.split(" ");
  return parts[0] === "Bearer" && parts[1] === expectedSecret;
}

function validateCronMode(mode: string | null): mode is "scan" | "digest" {
  return mode === "scan" || mode === "digest";
}

describe("cron endpoint auth", () => {
  const SECRET = "test-secret-at-least-32-characters-long";

  it("should reject requests without Bearer token", () => {
    expect(validateCronAuth(null, SECRET)).toBe(false);
  });

  it("should reject requests with wrong Bearer token", () => {
    expect(validateCronAuth("Bearer wrong-secret", SECRET)).toBe(false);
  });

  it("should accept valid CRON_SECRET", () => {
    expect(validateCronAuth(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("should return false for missing mode param", () => {
    expect(validateCronMode(null)).toBe(false);
  });

  it("should accept valid mode params", () => {
    expect(validateCronMode("scan")).toBe(true);
    expect(validateCronMode("digest")).toBe(true);
  });

  it("should reject invalid mode params", () => {
    expect(validateCronMode("invalid")).toBe(false);
  });
});
