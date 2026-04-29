import { describe, it, expect } from "vitest";

const roleRoutes: Record<string, string[]> = {
  super_admin: ["/owner", "/admin", "/operator", "/auditor", "/finance"],
  admin: ["/admin", "/operator", "/finance"],
  operator: ["/operator"],
  auditor: ["/auditor"],
  finance: ["/finance"],
};

function isAllowed(role: string, path: string): boolean {
  const allowed = roleRoutes[role] ?? [];
  return allowed.some((prefix) => path.startsWith(prefix));
}

describe("finance role routing", () => {
  it("finance role can access /finance", () => {
    expect(isAllowed("finance", "/finance")).toBe(true);
    expect(isAllowed("finance", "/finance/invoices")).toBe(true);
  });
  it("finance role cannot access /admin or /operator", () => {
    expect(isAllowed("finance", "/admin")).toBe(false);
    expect(isAllowed("finance", "/operator")).toBe(false);
    expect(isAllowed("finance", "/owner")).toBe(false);
    expect(isAllowed("finance", "/auditor")).toBe(false);
  });
  it("admin and super_admin can access /finance", () => {
    expect(isAllowed("admin", "/finance")).toBe(true);
    expect(isAllowed("super_admin", "/finance")).toBe(true);
  });
  it("operator and auditor cannot access /finance", () => {
    expect(isAllowed("operator", "/finance")).toBe(false);
    expect(isAllowed("auditor", "/finance")).toBe(false);
  });
});
