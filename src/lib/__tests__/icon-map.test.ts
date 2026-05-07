import { describe, it, expect } from "vitest";
import { Tractor, HelpCircle } from "lucide-react";
import { resolveEntityIcon } from "../icon-map";

describe("resolveEntityIcon", () => {
  it("returns the mapped Lucide component for a known vehicle type", () => {
    expect(resolveEntityIcon("vehicle.tractor")).toBe(Tractor);
  });
  it("falls back to HelpCircle for unknown keys", () => {
    expect(resolveEntityIcon("nonsense.key")).toBe(HelpCircle);
  });
  it("distinct keys map to distinct icons", () => {
    expect(resolveEntityIcon("vehicle.tractor")).not.toBe(
      resolveEntityIcon("crop.paddy")
    );
  });
});
