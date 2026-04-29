"use server";

import { auditLogs } from "@/db/schema";
import type { DB } from "@/db";

export async function logAudit(
  tx: DB,
  action: "create" | "update" | "delete" | "deactivate" | "login" | "logout",
  tableName: string,
  recordId: string,
  userId: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
  note?: string
) {
  try {
    await tx.insert(auditLogs).values({
      action,
      tableName,
      recordId,
      userId,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
      note: note ?? null,
    });
  } catch {
    // Audit log failure must never block the main operation
    console.error("[audit] Failed to write audit log", { action, tableName, recordId });
  }
}
