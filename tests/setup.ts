import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom is missing Pointer Capture APIs that some libs (e.g. vaul) call.
// Polyfill them as no-ops so click/pointer interactions don't blow up.
if (typeof Element !== "undefined") {
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
}

// jsdom does not implement matchMedia; components that gate on prefers-color-scheme
// rely on it. Provide a stub that always reports "no match" so theme code falls
// back to its localStorage path.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList);
}

// jsdom returns "" for `transform` and leaves `mozTransform` undefined; vaul
// reads `style.transform || style.webkitTransform || style.mozTransform` and
// then calls `.match()` on it. Force `transform` to "none" so vaul's regex
// path returns null cleanly (the same outcome a browser produces when unset).
if (typeof window !== "undefined") {
  const orig = window.getComputedStyle.bind(window);
  window.getComputedStyle = (el, pe) => {
    const cs = orig(el, pe);
    if (!cs.transform) {
      Object.defineProperty(cs, "transform", { value: "none", configurable: true });
    }
    return cs;
  };
}

afterEach(() => {
  cleanup();
});
