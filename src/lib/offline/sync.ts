/**
 * Sync engine — pushes locally-queued (offline) records to the server
 * when network is restored. Call syncAll() on the `online` window event.
 */
import { localDb } from "./db";

async function syncLogs(): Promise<void> {
  const pending = await localDb.offlineLogs
    .where("syncStatus")
    .equals("local")
    .toArray();

  for (const record of pending) {
    try {
      const res = await fetch("/api/logs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });

      if (res.ok) {
        const { id } = (await res.json()) as { id: string };
        await localDb.offlineLogs.update(record.id!, {
          serverId: id,
          syncStatus: "synced",
        });
      } else {
        await localDb.offlineLogs.update(record.id!, { syncStatus: "error" });
      }
    } catch {
      // Network still unavailable — leave as "local", retry next time
    }
  }
}

async function syncExpenses(): Promise<void> {
  const pending = await localDb.offlineExpenses
    .where("syncStatus")
    .equals("local")
    .toArray();

  for (const record of pending) {
    try {
      const res = await fetch("/api/expenses/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });

      if (res.ok) {
        const { id } = (await res.json()) as { id: string };
        await localDb.offlineExpenses.update(record.id!, {
          serverId: id,
          syncStatus: "synced",
        });
      } else {
        await localDb.offlineExpenses.update(record.id!, {
          syncStatus: "error",
        });
      }
    } catch {
      // Network still unavailable
    }
  }
}

export async function syncAll(): Promise<void> {
  await Promise.all([syncLogs(), syncExpenses()]);
}

/**
 * Registers a Background Sync event with the service worker so that sync
 * is attempted even if the tab is closed when connectivity is restored.
 * Falls back gracefully if the Background Sync API is not supported.
 */
export async function registerBackgroundSync(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // Background Sync API is not yet in all TS lib definitions
    if ("sync" in reg) {
      await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register("offline-sync");
    }
  } catch {
    // Not supported or registration failed — the window `online` event fallback handles it
  }
}

/** Count of records still waiting to sync */
export async function pendingSyncCount(): Promise<number> {
  const [logs, expenses] = await Promise.all([
    localDb.offlineLogs.where("syncStatus").equals("local").count(),
    localDb.offlineExpenses.where("syncStatus").equals("local").count(),
  ]);
  return logs + expenses;
}
