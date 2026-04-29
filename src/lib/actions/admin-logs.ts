"use server";

import { db } from "@/db";
import { dailyLogs, vehicles, staffProfiles, projects, payrollPeriods } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 20;

export interface AdminLogFilters {
  vehicleId?: string;
  operatorId?: string;
  projectId?: string;
  farmId?: string;
  dateFrom?: string;
  dateTo?: string;
  syncStatus?: string;
  q?: string;
  page?: number;
}

export async function getLogsForAdmin(filters: AdminLogFilters) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  const conditions = [];
  if (filters.vehicleId) conditions.push(eq(dailyLogs.vehicleId, filters.vehicleId));
  if (filters.operatorId) conditions.push(eq(dailyLogs.operatorId, filters.operatorId));
  if (filters.projectId) conditions.push(eq(dailyLogs.projectId, filters.projectId));
  if (filters.farmId) conditions.push(eq(dailyLogs.farmId, filters.farmId));
  if (filters.dateFrom) conditions.push(gte(dailyLogs.date, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(dailyLogs.date, filters.dateTo));
  if (filters.syncStatus) conditions.push(eq(dailyLogs.syncStatus, filters.syncStatus as "local" | "synced" | "conflict"));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const page = filters.page ?? 0;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: dailyLogs.id,
        date: dailyLogs.date,
        vehicleName: vehicles.name,
        vehicleId: dailyLogs.vehicleId,
        operatorName: staffProfiles.fullName,
        operatorId: dailyLogs.operatorId,
        projectId: dailyLogs.projectId,
        projectName: projects.name,
        startEngineHours: dailyLogs.startEngineHours,
        endEngineHours: dailyLogs.endEngineHours,
        fuelUsedLiters: dailyLogs.fuelUsedLiters,
        kmTraveled: dailyLogs.kmTraveled,
        acresWorked: dailyLogs.acresWorked,
        notes: dailyLogs.notes,
        syncStatus: dailyLogs.syncStatus,
      })
      .from(dailyLogs)
      .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
      .innerJoin(staffProfiles, eq(dailyLogs.operatorId, staffProfiles.id))
      .leftJoin(projects, eq(dailyLogs.projectId, projects.id))
      .where(where)
      .orderBy(sql`${dailyLogs.date} DESC`)
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE),
    db.select({ total: sql<number>`count(*)` }).from(dailyLogs).where(where),
  ]);

  return { rows, totalCount: Number(total), page, pageSize: PAGE_SIZE };
}

// Whitelist of editable fields
const EDITABLE_FIELDS = ["fuelUsedLiters", "kmTraveled", "acresWorked", "notes"] as const;

export async function updateLogByAdmin(
  logId: string,
  patch: Record<string, string | null>
) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  // Strip non-whitelist keys
  const safePatch: Record<string, string | null> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in patch) {
      safePatch[field] = patch[field] ?? null;
    }
  }

  if (Object.keys(safePatch).length === 0) {
    throw new Error("No editable fields provided");
  }

  // Fetch before-snapshot for audit
  const [before] = await db
    .select({
      fuelUsedLiters: dailyLogs.fuelUsedLiters,
      kmTraveled: dailyLogs.kmTraveled,
      acresWorked: dailyLogs.acresWorked,
      notes: dailyLogs.notes,
      operatorId: dailyLogs.operatorId,
      date: dailyLogs.date,
    })
    .from(dailyLogs)
    .where(eq(dailyLogs.id, logId));

  if (!before) throw new Error("Log not found");

  // Wrap update + payroll reset + audit in a transaction for consistency
  const affectedPayrolls = await db.transaction(async (tx) => {
    await tx
      .update(dailyLogs)
      .set({ ...safePatch, updatedAt: new Date() } as Record<string, unknown>)
      .where(eq(dailyLogs.id, logId));

    // Payroll guard: if log falls in a finalized or paid payroll period, reset to draft
    const affected = await tx
      .select({ id: payrollPeriods.id, status: payrollPeriods.status })
      .from(payrollPeriods)
      .where(
        and(
          eq(payrollPeriods.staffId, before.operatorId),
          lte(payrollPeriods.periodStart, before.date),
          gte(payrollPeriods.periodEnd, before.date),
          inArray(payrollPeriods.status, ["finalized", "paid"])
        )
      );

    for (const pp of affected) {
      await tx
        .update(payrollPeriods)
        .set({ status: "draft", updatedAt: new Date() })
        .where(eq(payrollPeriods.id, pp.id));
    }

    await logAudit(null, "update", "daily_logs", logId, session.userId, before as Record<string, unknown>, safePatch);

    return affected;
  });

  revalidatePath("/admin/logs");

  return {
    payrollResetCount: affectedPayrolls.length,
    warning: affectedPayrolls.length > 0
      ? `${affectedPayrolls.length} finalized/paid payroll period(s) reset to draft. Please re-compute.`
      : undefined,
  };
}
