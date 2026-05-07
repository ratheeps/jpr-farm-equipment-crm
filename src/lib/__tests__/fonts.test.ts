import { describe, it, expect, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: (opts: { variable?: string }) => ({
    variable: opts.variable ?? "",
    className: "mock-inter",
    style: { fontFamily: "Inter" },
  }),
  Noto_Sans_Tamil: (opts: { variable?: string }) => ({
    variable: opts.variable ?? "",
    className: "mock-noto-tamil",
    style: { fontFamily: "Noto Sans Tamil" },
  }),
  Noto_Sans_Sinhala: (opts: { variable?: string }) => ({
    variable: opts.variable ?? "",
    className: "mock-noto-sinhala",
    style: { fontFamily: "Noto Sans Sinhala" },
  }),
}));

import { fontForLocale, htmlClassForLocale } from "../fonts";

describe("fontForLocale", () => {
  it("returns a different font object per locale", () => {
    const en = fontForLocale("en");
    const ta = fontForLocale("ta");
    const si = fontForLocale("si");
    expect(en).not.toBe(ta);
    expect(en).not.toBe(si);
    expect(ta).not.toBe(si);
  });

  it("returns Inter (Latin-only) for English", () => {
    const en = fontForLocale("en");
    expect(en.variable).toBe("--font-sans");
  });

  it("returns the same variable name for every locale", () => {
    expect(fontForLocale("ta").variable).toBe("--font-sans");
    expect(fontForLocale("si").variable).toBe("--font-sans");
  });
});

describe("htmlClassForLocale", () => {
  it("emits a stable locale class", () => {
    expect(htmlClassForLocale("ta")).toBe("locale-ta");
    expect(htmlClassForLocale("si")).toBe("locale-si");
    expect(htmlClassForLocale("en")).toBe("locale-en");
  });
});
