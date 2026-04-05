/**
 * Web Push (VAPID) utility module.
 *
 * VAPID keys must be generated once for the deployment and stored in env vars:
 *   npx web-push generate-vapid-keys
 *
 * Add to .env.local / deployment secrets:
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *   VAPID_SUBJECT=mailto:admin@example.com
 */
import webpush from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export const vapidPublicKey = publicKey ?? "";

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<void> {
  if (!publicKey || !privateKey) {
    console.warn("[push] VAPID keys not configured — skipping push notification");
    return;
  }
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
    { TTL: 60 * 60 } // 1-hour time-to-live
  );
}
