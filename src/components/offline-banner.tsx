"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WifiOff, Wifi } from "lucide-react";
import { syncAll, pendingSyncCount, registerBackgroundSync } from "@/lib/offline/sync";

export function OfflineBanner() {
  const t = useTranslations("operator");
  const [isOnline, setIsOnline] = useState(true);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOffline = () => setIsOnline(false);
    const handleOnline = async () => {
      setIsOnline(true);
      const pending = await pendingSyncCount();
      if (pending > 0) {
        setShowRestored(true);
        // Try Background Sync API first (works even if tab closes mid-sync)
        await registerBackgroundSync();
        // Also sync directly as a fast path for browsers that support it
        await syncAll();
        setTimeout(() => setShowRestored(false), 3000);
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
        isOnline
          ? "bg-green-100 text-green-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {isOnline ? (
        <Wifi className="h-4 w-4 shrink-0" />
      ) : (
        <WifiOff className="h-4 w-4 shrink-0" />
      )}
      <span>{isOnline ? t("onlineRestored") : t("offlineBanner")}</span>
    </div>
  );
}
