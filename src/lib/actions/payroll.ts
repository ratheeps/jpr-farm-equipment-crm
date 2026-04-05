"use server";

import { db } from "@/db";
import {
  payrollPeriods,
  staffProfiles,
  dailyLogs,
  staffLeaves,
  users,
} from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { validatePayrollGeneration } from "@/lib/validations";

// ─── Generate payroll for a single staff member for a period ─────────────────

export async function generatePayroll(data: {
  staffId: string;
  periodStart: string;
  periodEnd: string;
}) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  const validated = validatePayrollGeneration(data);

  // Fetch staff pay configuration
  const [staff] = await db
    .select({
      id: staffProfiles.id,
      payRate: staffProfiles.payRate,
      payType: staffProfiles.payType,
    })
    .from(staffProfiles)
    .where(eq(staffProfiles.id, validated.staffId));

  if (!staff) throw new Error("Staff not found");

  const payRate = Number(staff.payRate ?? 0);

  // Aggregate daily logs for this staff member in the period
  const [logAgg] = await db
    .select({
      totalHours: sql<string>`COALESCE(SUM(${dailyLogs.endEngineHours} - ${dailyLogs.startEngineHours}), 0)`,
      totalAcres: sql<string>`COALESCE(SUM(${dailyLogs.acresWorked}), 0)`,
      totalKm: sql<string>`COALESCE(SUM(${dailyLogs.kmTraveled}), 0)`,
      logDays: sql<string>`COUNT(DISTINCT ${dailyLogs.date})`,
    })
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.operatorId, validated.staffId),
        gte(dailyLogs.date, validated.periodStart),
        lte(dailyLogs.date, validated.periodEnd),
        sql`${dailyLogs.endEngineHours} IS NOT NULL`
      )
    );

  const totalHours = Number(logAgg?.totalHours ?? 0);
  const totalAcres = Number(logAgg?.totalAcres ?? 0);
  const totalKm = Number(logAgg?.totalKm ?? 0);
  const logDays = Number(logAgg?.logDays ?? 0);

  // Count approved leave days in the period
  const [leaveAgg] = await db
    .select({
      leaveDays: sql<string>`COALESCE(SUM(
        ${staffLeaves.endDate}::date - ${staffLeaves.startDate}::date + 1
      ), 0)`,
    })
    .from(staffLeaves)
    .where(
      and(
        eq(staffLeaves.staffId, validated.staffId),
        eq(staffLeaves.status, "approved"),
        gte(staffLeaves.startDate, validated.periodStart),
        lte(staffLeaves.endDate, validated.periodEnd)
      )
    );

  const leaveDays = Number(leaveAgg?.leaveDays ?? 0);

  // Calculate pay based on payType
  let basePay = 0;
  let performanceBonus = 0;

  switch (staff.payType) {
    case "hourly":
      basePay = totalHours * payRate;
      break;
    case "daily":
      basePay = (logDays - leaveDays) * payRate;
      break;
    case "monthly":
      basePay = payRate; // flat monthly rate
      break;
    case "per_acre":
      // per_acre: base = payRate × acres (performance model)
      // If there was a fixed basePay we'd add it here; for now it's simple per-acre
      performanceBonus = totalAcres * payRate;
      basePay = 0;
      break;
  }

  const netPay = Math.max(0, basePay + performanceBonus);

  // Upsert payroll record (one per staff per period)
  const existing = await db
    .select({ id: payrollPeriods.id, status: payrollPeriods.status })
    .from(payrollPeriods)
    .where(
      and(
        eq(payrollPeriods.staffId, validated.staffId),
        eq(payrollPeriods.periodStart, validated.periodStart),
        eq(payrollPeriods.periodEnd, validated.periodEnd)
      )
    )
    .limit(1);

  if (existing[0]?.status === "finalized" || existing[0]?.status === "paid") {
    throw new Error("This payroll period is already finalized");
  }

  let payrollId: string;
  if (existing[0]) {
    await db
      .update(payrollPeriods)
      .set({
        totalHoursWorked: String(totalHours),
        totalAcresWorked: String(totalAcres),
        totalKmTraveled: String(totalKm),
        totalLogDays: logDays,
        leaveDays,
        basePay: String(basePay),
        performanceBonus: String(performanceBonus),
        netPay: String(netPay),
        status: "draft",
        updatedAt: new Date(),
      })
      .where(eq(payrollPeriods.id, existing[0].id));
    payrollId = existing[0].id;
  } else {
    const [row] = await db
      .insert(payrollPeriods)
      .values({
        staffId: validated.staffId,
        periodStart: validated.periodStart,
        periodEnd: validated.periodEnd,
        totalHoursWorked: String(totalHours),
        totalAcresWorked: String(totalAcres),
        totalKmTraveled: String(totalKm),
        totalLogDays: logDays,
        leaveDays,
        basePay: String(basePay),
        performanceBonus: String(performanceBonus),
        netPay: String(netPay),
        status: "draft",
      })
      .returning({ id: payrollPeriods.id });
    payrollId = row.id;
  }

  await logAudit("create", "payroll_periods", payrollId, session.userId, undefined, {
    staffId: validated.staffId,
    period: `${validated.periodStart} - ${validated.periodEnd}`,
  });

  revalidatePath("/admin/staff/payroll");
  return payrollId;
}

export async function finalizePayroll(payrollId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  const [row] = await db
    .select({ status: payrollPeriods.status })
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, payrollId));

  if (!row) throw new Error("Payroll record not found");
  if (row.status !== "draft") throw new Error("Only draft payroll can be finalized");

  await db
    .update(payrollPeriods)
    .set({ status: "finalized", updatedAt: new Date() })
    .where(eq(payrollPeriods.id, payrollId));

  revalidatePath("/admin/staff/payroll");
}

export async function markPayrollPaid(payrollId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin")) throw new Error("Forbidden");

  await db
    .update(payrollPeriods)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(payrollPeriods.id, payrollId));

  revalidatePath("/admin/staff/payroll");
}

export async function getPayrollList(filters?: {
  staffId?: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  const conditions = [];
  if (filters?.staffId) conditions.push(eq(payrollPeriods.staffId, filters.staffId));
  if (filters?.periodStart) conditions.push(gte(payrollPeriods.periodStart, filters.periodStart));
  if (filters?.periodEnd) conditions.push(lte(payrollPeriods.periodEnd, filters.periodEnd));

  return db
    .select({
      id: payrollPeriods.id,
      staffId: payrollPeriods.staffId,
      staffName: staffProfiles.fullName,
      staffPayType: staffProfiles.payType,
      periodStart: payrollPeriods.periodStart,
      periodEnd: payrollPeriods.periodEnd,
      totalHoursWorked: payrollPeriods.totalHoursWorked,
      totalAcresWorked: payrollPeriods.totalAcresWorked,
      totalKmTraveled: payrollPeriods.totalKmTraveled,
      totalLogDays: payrollPeriods.totalLogDays,
      leaveDays: payrollPeriods.leaveDays,
      basePay: payrollPeriods.basePay,
      performanceBonus: payrollPeriods.performanceBonus,
      netPay: payrollPeriods.netPay,
      status: payrollPeriods.status,
      createdAt: payrollPeriods.createdAt,
    })
    .from(payrollPeriods)
    .innerJoin(staffProfiles, eq(payrollPeriods.staffId, staffProfiles.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(payrollPeriods.periodStart, staffProfiles.fullName);
}

/** Generate payroll for ALL active operators for a period at once */
export async function generatePayrollForAll(
  periodStart: string,
  periodEnd: string
) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  const allOperators = await db
    .select({ id: staffProfiles.id })
    .from(staffProfiles)
    .innerJoin(users, eq(staffProfiles.userId, users.id))
    .where(and(eq(users.isActive, true), eq(users.role, "operator")));

  const results = await Promise.allSettled(
    allOperators.map((op) =>
      generatePayroll({ staffId: op.id, periodStart, periodEnd })
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  revalidatePath("/admin/staff/payroll");
  return { succeeded, failed };
}
