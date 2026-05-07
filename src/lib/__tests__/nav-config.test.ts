import { describe, it, expect } from "vitest";
import { getNavConfig, type RoleNavKey } from "../nav-config";

const ALL_ROLES: RoleNavKey[] = ["operator", "admin", "finance", "owner", "auditor"];

describe("getNavConfig", () => {
  it("returns 5 tabs for each role", () => {
    for (const role of ALL_ROLES) {
      expect(getNavConfig(role).tabs).toHaveLength(5);
    }
  });

  it("returns FAB config for action roles", () => {
    expect(getNavConfig("operator").fab).toBeDefined();
    expect(getNavConfig("admin").fab).toBeDefined();
    expect(getNavConfig("finance").fab).toBeDefined();
  });

  it("returns no FAB for read-only roles", () => {
    expect(getNavConfig("owner").fab).toBeUndefined();
    expect(getNavConfig("auditor").fab).toBeUndefined();
  });

  it("operator FAB targets log-work", () => {
    expect(getNavConfig("operator").fab?.href).toBe("/operator/log");
  });

  it("ends every role's tab list with a More action tab", () => {
    for (const role of ALL_ROLES) {
      const last = getNavConfig(role).tabs.at(-1);
      expect(last?.labelKey).toBe("more");
      expect(last?.kind).toBe("action");
    }
  });

  it("link tabs target dashboard-prefixed paths only", () => {
    const allowedRoots = new Set(["operator", "admin", "finance", "owner", "auditor"]);
    for (const role of ALL_ROLES) {
      for (const tab of getNavConfig(role).tabs) {
        if (tab.kind !== "link") continue;
        const segments = tab.href.split("/").filter(Boolean);
        expect(allowedRoots.has(segments[0])).toBe(true);
      }
    }
  });

  it("FAB hrefs target dashboard-prefixed paths", () => {
    const allowedRoots = new Set(["operator", "admin", "finance"]);
    for (const role of ALL_ROLES) {
      const fab = getNavConfig(role).fab;
      if (!fab) continue;
      const segments = fab.href.split("/").filter(Boolean);
      expect(allowedRoots.has(segments[0])).toBe(true);
    }
  });
});
