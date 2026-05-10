import { describe, it, expect, beforeEach } from "vitest";
import {
  canPromptInstall,
  recordSession,
  recordSyncSuccess,
} from "../install-prompt";

describe("canPromptInstall", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns false on the first session with no successful sync (spec gating)", () => {
    expect(canPromptInstall()).toBe(false);
  });

  it("returns true after the second session is recorded", () => {
    recordSession();
    recordSession();
    expect(canPromptInstall()).toBe(true);
  });

  it("returns true after a successful sync (even on first session)", () => {
    recordSession();
    recordSyncSuccess();
    expect(canPromptInstall()).toBe(true);
  });

  it("returns false within 7 days of last dismissal even if otherwise eligible", () => {
    recordSession();
    recordSession();
    localStorage.setItem("install-prompt:dismissedAt", String(Date.now()));
    expect(canPromptInstall()).toBe(false);
  });

  it("returns true after 7 days from last dismissal", () => {
    recordSession();
    recordSession();
    const eightDaysAgo = Date.now() - 8 * 24 * 3600 * 1000;
    localStorage.setItem("install-prompt:dismissedAt", String(eightDaysAgo));
    expect(canPromptInstall()).toBe(true);
  });
});
