/**
 * Dexie.js IndexedDB schema for offline-first support.
 * All writes go to IndexedDB first; a sync engine pushes them to the server.
 */
import Dexie, { type EntityTable } from "dexie";

export interface OfflineLog {
  id?: number; // auto-increment local ID
  deviceId: string; // client-generated UUID for dedup
  serverId?: string; // populated after successful sync
  vehicleId: string;
  projectId?: string;
  date: string; // YYYY-MM-DD
  startEngineHours: number;
  endEngineHours?: number;
  startTime?: number; // Unix ms
  endTime?: number;
  gpsLatStart?: number;
  gpsLngStart?: number;
  gpsLatEnd?: number;
  gpsLngEnd?: number;
  fuelUsedLiters?: number;
  kmTraveled?: number;
  acresWorked?: number;
  notes?: string;
  action: "start" | "end"; // which operation to sync
  syncStatus: "local" | "synced" | "error";
  createdAt: number; // Unix ms
}

export interface OfflineExpense {
  id?: number;
  deviceId: string;
  serverId?: string;
  vehicleId?: string;
  projectId?: string;
  logId?: string; // server log ID
  category: string;
  amount: number;
  description?: string;
  receiptImagePath?: string; // local file path / object URL
  date: string; // YYYY-MM-DD
  syncStatus: "local" | "synced" | "error";
  createdAt: number;
}

class JprDatabase extends Dexie {
  offlineLogs!: EntityTable<OfflineLog, "id">;
  offlineExpenses!: EntityTable<OfflineExpense, "id">;

  constructor() {
    super("jpr_offline_db");
    this.version(1).stores({
      offlineLogs: "++id, deviceId, serverId, syncStatus, date",
      offlineExpenses: "++id, deviceId, serverId, syncStatus, date",
    });
  }
}

// Singleton — safe to import in any client component
export const localDb = new JprDatabase();
