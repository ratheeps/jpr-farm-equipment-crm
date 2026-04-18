import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// `defaultCache` caches Next.js runtime assets (JS, CSS, fonts).
// We add custom strategies for our translation files and app shell.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// eslint-disable-next-line no-var
declare var self: WorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// ─── Type declarations for SW-specific events not in standard `dom` lib ──────
interface ExtendableEventWithWaitUntil extends Event {
  waitUntil(f: Promise<unknown>): void;
}
interface SyncEventCompat extends ExtendableEventWithWaitUntil {
  readonly tag: string;
  readonly lastChance: boolean;
}
interface PushMessageDataCompat {
  json<T = unknown>(): T;
}
interface PushEventCompat extends ExtendableEventWithWaitUntil {
  readonly data: PushMessageDataCompat | null;
}
interface NotificationEventCompat extends ExtendableEventWithWaitUntil {
  readonly notification: Notification;
}
interface ServiceWorkerRegistrationCompat {
  showNotification(title: string, options?: NotificationOptions): Promise<void>;
}
interface ClientCompat {
  focus(): Promise<unknown>;
}
interface ClientsCompat {
  matchAll(options?: { type?: string; includeUncontrolled?: boolean }): Promise<ClientCompat[]>;
  openWindow(url: string): Promise<unknown>;
}
interface ServiceWorkerGlobalScopeCompat {
  registration: ServiceWorkerRegistrationCompat;
  clients: ClientsCompat;
}

// ─── Background Sync ──────────────────────────────────────────────────────────
// Replays the IndexedDB queue when the device regains connectivity.
// This allows syncing to happen even when the app tab is closed.

self.addEventListener("sync", (event) => {
  const syncEvent = event as unknown as SyncEventCompat;
  if (syncEvent.tag === "offline-sync") {
    syncEvent.waitUntil(replayOfflineQueue());
  }
});

async function replayOfflineQueue(): Promise<void> {
  try {
    // Open IndexedDB created by Dexie (db name: "jpr-offline")
    const dbRequest = indexedDB.open("jpr-offline");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      dbRequest.onsuccess = () => resolve(dbRequest.result);
      dbRequest.onerror = () => reject(dbRequest.error);
    });

    await Promise.all([
      replayStore(db, "offlineLogs", "/api/logs/sync"),
      replayStore(db, "offlineExpenses", "/api/expenses/sync"),
    ]);
  } catch {
    // Silently fail — next sync event will retry
  }
}

async function replayStore(
  db: IDBDatabase,
  storeName: string,
  endpoint: string
): Promise<void> {
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);

  const records = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
    const index = store.index("syncStatus");
    const req = index.getAll("local");
    req.onsuccess = () => resolve(req.result as Record<string, unknown>[]);
    req.onerror = () => reject(req.error);
  });

  for (const record of records) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": self.location.origin,
        },
        credentials: "include",
        body: JSON.stringify(record),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        // Mark as synced in IndexedDB
        const updateTx = db.transaction(storeName, "readwrite");
        const updateStore = updateTx.objectStore(storeName);
        const key = (record as { id?: IDBValidKey }).id;
        if (key !== undefined) {
          const getReq = updateStore.get(key);
          getReq.onsuccess = () => {
            const item = getReq.result as Record<string, unknown>;
            if (item) {
              item.syncStatus = "synced";
              if (data.id) item.serverId = data.id;
              updateStore.put(item);
            }
          };
        }
      }
    } catch {
      // Network error — will retry on next sync event
    }
  }
}

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  const pushEvent = event as unknown as PushEventCompat;
  const data = pushEvent.data?.json<{
    title?: string;
    body?: string;
    icon?: string;
    tag?: string;
    url?: string;
  }>() ?? {};

  const title = data.title ?? "JPR Alert";
  const options: NotificationOptions = {
    body: data.body ?? "",
    icon: data.icon ?? "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: data.tag ?? "jpr-notification",
    requireInteraction: false,
    data: { url: data.url ?? "/" },
  };

  pushEvent.waitUntil(
    (self as unknown as ServiceWorkerGlobalScopeCompat).registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  const notifEvent = event as unknown as NotificationEventCompat;
  notifEvent.notification.close();
  const url = notifEvent.notification.data?.url ?? "/";
  notifEvent.waitUntil(
    (self as unknown as ServiceWorkerGlobalScopeCompat).clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        if (windowClients.length > 0) {
          return windowClients[0].focus();
        }
        return (self as unknown as ServiceWorkerGlobalScopeCompat).clients.openWindow(url);
      })
  );
});

