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
