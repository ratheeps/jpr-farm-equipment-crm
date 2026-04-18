"use server";

import { db } from "@/db";
import {
  payrollPeriods,
  staffProfiles,
  dailyLogs,
  staffLeaves,
  users,
  vehicles,
} from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { validatePayrollGeneration } from "@/lib/validations";
import { computePayBreakdown } from "@/lib/payroll-calc";

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

  // Fetch individual logs with their vehicle data for per-unit bonus calculation
  const logsWithVehicles = await db
    .select({
      startEngineHours: dailyLogs.startEngineHours,
      endEngineHours: dailyLogs.endEngineHours,
      acresWorked: dailyLogs.acresWorked,
      kmTraveled: dailyLogs.kmTraveled,
      tripAllowanceOverride: dailyLogs.tripAllowanceOverride,
      vehicleId: vehicles.id,
      vehicleBillingModel: vehicles.billingModel,
      vehicleOperatorRate: vehicles.operatorRatePerUnit,
      vehicleTripAllowance: vehicles.tripAllowance,
      logDate: dailyLogs.date,
    })
    .from(dailyLogs)
    .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
    .where(
      and(
        eq(dailyLogs.operatorId, validated.staffId),
        gte(dailyLogs.date, validated.periodStart),
        lte(dailyLogs.date, validated.periodEnd),
        sql`${dailyLogs.endEngineHours} IS NOT NULL`
      )
    );

  const logDays = new Set(logsWithVehicles.map((l) => l.logDate)).size;

  // Count leave days — for monthly pay type, only unpaid leave is deducted (Spec §2.2)
  const leaveConditions = [
    eq(staffLeaves.staffId, validated.staffId),
    gte(staffLeaves.startDate, validated.periodStart),
    lte(staffLeaves.startDate, validated.periodEnd),
    eq(staffLeaves.status, "approved"),
  ];

  if (staff.payType === "monthly") {
    leaveConditions.push(eq(staffLeaves.leaveType, "unpaid"));
  }

  const [leaveAgg] = await db
    .select({
      leaveDays: sql<string>`COALESCE(SUM(
        ${staffLeaves.endDate}::date - ${staffLeaves.startDate}::date + 1
      ), 0)`,
    })
    .from(staffLeaves)
    .where(and(...leaveConditions));

  const leaveDays = Number(leaveAgg?.leaveDays ?? 0);

  const payrollLogs = logsWithVehicles.map((l) => ({
    startEngineHours: l.startEngineHours,
    endEngineHours: l.endEngineHours,
    acresWorked: l.acresWorked,
    kmTraveled: l.kmTraveled,
    tripAllowanceOverride: l.tripAllowanceOverride,
    vehicle: {
      vehicleId: l.vehicleId,
      billingModel: l.vehicleBillingModel,
      operatorRatePerUnit: l.vehicleOperatorRate,
      tripAllowance: l.vehicleTripAllowance,
    },
  }));

  // Calculate period duration for monthly proration
  const periodStart = new Date(validated.periodStart);
  const periodEnd = new Date(validated.periodEnd);
  const periodDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const breakdown = computePayBreakdown({
    payType: staff.payType!,
    payRate,
    logs: payrollLogs,
    logDays,
    leaveDays,
    periodDays,
  });

  // Spec §2.6: Warn admin about vehicles without configured operatorRatePerUnit
  if (breakdown.unconfiguredVehicleIds.length > 0) {
    console.warn(
      `Payroll for staff ${validated.staffId}: vehicles missing operatorRatePerUnit:`,
      breakdown.unconfiguredVehicleIds
    );
  }

  // Compute aggregates for display (totalHours, totalAcres, totalKm)
  const totalHours = payrollLogs.reduce((s, l) =>
    s + Math.max(0, Number(l.endEngineHours ?? 0) - Number(l.startEngineHours ?? 0)), 0);
  const totalAcres = payrollLogs.reduce((s, l) => s + Number(l.acresWorked ?? 0), 0);
  const totalKm = payrollLogs.reduce((s, l) => s + Number(l.kmTraveled ?? 0), 0);

  const netPay = Math.max(0, breakdown.gross);

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
        basePay: String(breakdown.basePay),
        performanceBonus: String(breakdown.performanceBonus),
        perUnitBonusTotal: String(breakdown.perUnitBonusTotal),
        tripAllowanceTotal: String(breakdown.tripAllowanceTotal),
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
        basePay: String(breakdown.basePay),
        performanceBonus: String(breakdown.performanceBonus),
        perUnitBonusTotal: String(breakdown.perUnitBonusTotal),
        tripAllowanceTotal: String(breakdown.tripAllowanceTotal),
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
      perUnitBonusTotal: payrollPeriods.perUnitBonusTotal,
      tripAllowanceTotal: payrollPeriods.tripAllowanceTotal,
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
