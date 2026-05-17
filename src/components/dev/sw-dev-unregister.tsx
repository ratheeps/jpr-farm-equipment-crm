"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "jpr-sw-dev-cleared";

// Unregisters any active service worker + clears caches in development.
// Serwist disables SW writes in dev, but a SW registered during a prior
// `pnpm build && pnpm start` session stays active in the browser and
// intercepts dev chunk fetches with stale cached responses, producing
// "Cannot read properties of undefined (reading 'call')" webpack errors.
// If the page is currently SW-controlled, reload once after cleanup so
// the dev chunks load uncached. The NODE_ENV check is inlined at build
// time, so this is a no-op in production.
export function SwDevUnregister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const wasControlled = !!navigator.serviceWorker.controller;
    const alreadyCleared = sessionStorage.getItem(RELOAD_FLAG) === "1";

    void Promise.all([
      navigator.serviceWorker.getRegistrations().then((regs) =>
        Promise.all(regs.map((r) => r.unregister()))
      ),
      typeof caches !== "undefined"
        ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        : Promise.resolve(),
    ]).then(() => {
      if (wasControlled && !alreadyCleared) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        location.reload();
      }
    });
  }, []);

  return null;
}
