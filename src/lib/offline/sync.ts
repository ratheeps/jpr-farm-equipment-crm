/**
 * Sync engine - pushes locally-queued (offline) records to the server
 * when network is restored. Call syncAll() on the `online` window event.
 */
import { localDb } from "./db";

async function syncLogs(): Promise<number> {
  const pending = await localDb.offlineLogs
    .where("syncStatus")
    .equals("local")
    .toArray();

  let synced = 0;
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
        synced += 1;
      } else {
        await localDb.offlineLogs.update(record.id!, { syncStatus: "error" });
      }
    } catch {
      // Network still unavailable - leave as "local", retry next time
    }
  }
  return synced;
}

async function syncExpenses(): Promise<number> {
  const pending = await localDb.offlineExpenses
    .where("syncStatus")
    .equals("local")
    .toArray();

  let synced = 0;
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
        synced += 1;
      } else {
        await localDb.offlineExpenses.update(record.id!, {
          syncStatus: "error",
        });
      }
    } catch {
      // Network still unavailable
    }
  }
  return synced;
}

export async function syncAll(): Promise<void> {
  try {
    const [logs, expenses] = await Promise.all([syncLogs(), syncExpenses()]);
    // Mirror SYNC_SUCCESS_KEY from install-prompt.tsx without importing
    // (sync.ts is imported by offline-banner; back-import would cycle).
    // Only flip the flag when at least one record actually transitioned
    // local -> synced; an online event with no pending records or with
    // server errors should not gate the install prompt.
    if (typeof window !== "undefined" && logs + expenses > 0) {
      window.localStorage.setItem("install-prompt:syncSucceeded", "1");
    }
  } finally {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jpr:sync-done"));
    }
  }
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
    // Not supported or registration failed - the window `online` event fallback handles it
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
