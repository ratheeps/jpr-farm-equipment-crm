"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

export function NotificationPreferences() {
  const t = useTranslations("alerts");
  const [subscribed, setSubscribed] = useState(false);
  const [preferCritical, setPreferCritical] = useState(true);
  const [preferDailyDigest, setPreferDailyDigest] = useState(true);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    }
  }, []);

  async function handleSubscribe() {
    if (!vapidKey) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });
    const json = sub.toJSON();

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        preferCritical,
        preferDailyDigest,
      }),
    });
    setSubscribed(true);
  }

  async function handleUnsubscribe() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    setSubscribed(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("notificationPreferences")}</h2>

      {!subscribed ? (
        <button
          onClick={handleSubscribe}
          className="h-10 px-4 bg-primary text-primary-foreground rounded-xl font-semibold"
        >
          {t("enablePushNotifications")}
        </button>
      ) : (
        <button
          onClick={handleUnsubscribe}
          className="h-10 px-4 bg-destructive text-destructive-foreground rounded-xl font-semibold"
        >
          {t("unsubscribe")}
        </button>
      )}

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={preferCritical}
          onChange={(e) => setPreferCritical(e.target.checked)} />
        {t("criticalAlerts")}
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={preferDailyDigest}
          onChange={(e) => setPreferDailyDigest(e.target.checked)} />
        {t("dailyDigest")}
      </label>
    </div>
  );
}
