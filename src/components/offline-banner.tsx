"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";
import {
  syncAll,
  pendingSyncCount,
  registerBackgroundSync,
} from "@/lib/offline/sync";

interface OfflineBannerProps {
  getPendingCount?: () => Promise<number>;
}

export function OfflineBanner({
  getPendingCount = pendingSyncCount,
}: OfflineBannerProps = {}) {
  const t = useTranslations("operator");
  const tBanner = useTranslations("offlineBanner");
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function refreshPending() {
      try {
        const n = await getPendingCount();
        if (!cancelled) setPending(n);
      } catch {
        // pendingSyncCount throws during SSR or when Dexie is unavailable.
      }
    }

    setIsOnline(navigator.onLine);
    refreshPending();

    const onOffline = () => setIsOnline(false);
    const onOnline = async () => {
      setIsOnline(true);
      await registerBackgroundSync();
      await syncAll();
      await refreshPending();
    };
    // Dexie-backed sync engine fires this CustomEvent after every push.
    // It replaces the old 5s polling loop, which drained battery on idle
    // operator phones for no useful update signal.
    const onSyncDone = () => refreshPending();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshPending();
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("jpr:sync-done", onSyncDone);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("jpr:sync-done", onSyncDone);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [getPendingCount]);

  if (isOnline && pending === 0) return null;

  const offlineCopy = t("offlineBanner");
  const message = isOnline
    ? tBanner("syncingPending", { count: pending })
    : pending > 0
    ? tBanner("offlineUnsynced", { base: offlineCopy, count: pending })
    : offlineCopy;

  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-warning/15 px-4 py-2 text-sm font-semibold text-warning-foreground"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
