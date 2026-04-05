import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn (class name utility)", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("deduplicates conflicting Tailwind classes", () => {
    // twMerge should resolve conflicts — last one wins
    expect(cn("p-4", "p-8")).toBe("p-8");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("handles undefined and null gracefully", () => {
    expect(cn("base", undefined, null, "extra")).toBe("base extra");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});
