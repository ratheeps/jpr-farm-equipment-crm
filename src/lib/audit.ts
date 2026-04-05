"use server";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAudit(
  action: "create" | "update" | "delete" | "deactivate" | "login" | "logout",
  tableName: string,
  recordId: string,
  userId: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
  note?: string
) {
  try {
    await db.insert(auditLogs).values({
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
