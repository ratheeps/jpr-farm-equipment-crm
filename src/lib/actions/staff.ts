"use server";

import { withRLS, type DB } from "@/db";
import {
  users,
  staffProfiles,
  dailyLogs,
  vehicles,
  vehicleAssignments,
  projectAssignments,
  projects,
} from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";

export type StaffFormData = {
  phone: string;
  password?: string;
  role: string;
  preferredLocale: string;
  fullName: string;
  staffPhone?: string;
  nicNumber?: string;
  payRate?: string;
  payType: string;
};

export type StaffActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string>; formError?: string };

const USER_ROLES = ["super_admin", "admin", "operator", "auditor", "finance"] as const;
const PAY_TYPES = ["hourly", "daily", "monthly", "per_acre"] as const;
const LOCALES = ["ta", "si", "en"] as const;

// Field-level validation. Keys map to messages in messages/*.json -> staff.errors.<key>.
function validateStaffFields(
  data: StaffFormData,
  opts: { requirePassword: boolean }
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.fullName?.trim()) errors.fullName = "fullNameRequired";
  if (!data.phone?.trim()) errors.phone = "phoneRequired";
  else if (!/^\d{10}$/.test(data.phone.trim())) errors.phone = "phoneInvalid";
  if (opts.requirePassword) {
    if (!data.password) errors.password = "passwordRequired";
    else if (data.password.length < 6) errors.password = "passwordTooShort";
  }
  if (!data.role || !USER_ROLES.includes(data.role as typeof USER_ROLES[number]))
    errors.role = "roleRequired";
  if (!data.payType || !PAY_TYPES.includes(data.payType as typeof PAY_TYPES[number]))
    errors.payType = "payTypeRequired";
  if (
    data.preferredLocale &&
    !LOCALES.includes(data.preferredLocale as typeof LOCALES[number])
  ) {
    errors.preferredLocale = "roleRequired";
  }
  if (data.payRate && data.payRate.trim() !== "") {
    const n = Number(data.payRate);
    if (Number.isNaN(n) || n < 0) errors.payRate = "payRateInvalid";
  }
  return errors;
}

function isUniqueViolation(e: unknown, constraint: string): boolean {
  const err = e as { code?: string; constraint?: string } | undefined;
  return err?.code === "23505" && err?.constraint === constraint;
}

// ─── Internal tx-aware helpers ────────────────────────────────────────────────

async function getStaffTx(tx: DB, userId: string) {
  const results = await tx
    .select({
      userId: users.id,
      phone: users.phone,
      role: users.role,
      preferredLocale: users.preferredLocale,
      isActive: users.isActive,
      fullName: staffProfiles.fullName,
      staffPhone: staffProfiles.phone,
      nicNumber: staffProfiles.nicNumber,
      payRate: staffProfiles.payRate,
      payType: staffProfiles.payType,
    })
    .from(users)
    .leftJoin(staffProfiles, eq(staffProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  return results[0] ?? null;
}

// ─── Exported actions ─────────────────────────────────────────────────────────

export async function createStaff(
  data: StaffFormData
): Promise<StaffActionResult> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    return { ok: false, formError: "forbidden" };
  }

  const fieldErrors = validateStaffFields(data, { requirePassword: true });
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const passwordHash = await hashPassword(data.password!);
  const phone = data.phone.trim();
  const staffPhone = data.staffPhone?.trim() || phone;

  try {
    await withRLS(session.userId, session.role, async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          phone,
          passwordHash,
          role: data.role as never,
          preferredLocale: data.preferredLocale as never,
        })
        .returning({ id: users.id });

      await tx.insert(staffProfiles).values({
        userId: user.id,
        fullName: data.fullName.trim(),
        phone: staffPhone,
        nicNumber: data.nicNumber?.trim() || null,
        payRate: data.payRate?.trim() || null,
        payType: data.payType as never,
      });

      await logAudit(tx, "create", "users", user.id, session.userId, undefined, {
        phone,
        role: data.role,
      });
    });
  } catch (e) {
    if (isUniqueViolation(e, "users_phone_unique")) {
      return { ok: false, fieldErrors: { phone: "phoneDuplicate" } };
    }
    throw e;
  }

  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function updateStaff(
  userId: string,
  data: Omit<StaffFormData, "password">
): Promise<StaffActionResult> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    return { ok: false, formError: "forbidden" };
  }

  const fieldErrors = validateStaffFields(
    { ...data, password: "_skip_" } as StaffFormData,
    { requirePassword: false }
  );
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const staffPhone = data.staffPhone?.trim() || data.phone.trim();

  try {
    await withRLS(session.userId, session.role, async (tx) => {
      await tx
        .update(users)
        .set({
          role: data.role as never,
          preferredLocale: data.preferredLocale as never,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await tx
        .update(staffProfiles)
        .set({
          fullName: data.fullName.trim(),
          phone: staffPhone,
          nicNumber: data.nicNumber?.trim() || null,
          payRate: data.payRate?.trim() || null,
          payType: data.payType as never,
          updatedAt: new Date(),
        })
        .where(eq(staffProfiles.userId, userId));

      await logAudit(tx, "update", "users", userId, session.userId);
    });
  } catch (e) {
    if (isUniqueViolation(e, "users_phone_unique")) {
      return { ok: false, fieldErrors: { phone: "phoneDuplicate" } };
    }
    throw e;
  }

  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function getStaffList() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx) => {
    return tx
      .select({
        userId: users.id,
        phone: users.phone,
        role: users.role,
        preferredLocale: users.preferredLocale,
        isActive: users.isActive,
        fullName: staffProfiles.fullName,
        staffPhone: staffProfiles.phone,
        nicNumber: staffProfiles.nicNumber,
        payRate: staffProfiles.payRate,
        payType: staffProfiles.payType,
      })
      .from(users)
      .leftJoin(staffProfiles, eq(staffProfiles.userId, users.id))
      .orderBy(staffProfiles.fullName);
  });
}

export async function getStaff(userId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx) => {
    return getStaffTx(tx, userId);
  });
}

export async function deactivateStaff(userId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin")) {
    throw new Error("Forbidden");
  }

  await withRLS(session.userId, session.role, async (tx) => {
    await tx
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await logAudit(tx, "deactivate", "users", userId, session.userId);
  });

  revalidatePath("/admin/staff");
}

// ─── Enriched staff profile with assignments and work stats ──────────────────

export async function getStaffProfileDetails(userId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  return withRLS(session.userId, session.role, async (tx) => {
    const staffData = await getStaffTx(tx, userId);
    if (!staffData) return null;

    // Staff profile ID (not userId)
    const [profile] = await tx
      .select({ id: staffProfiles.id })
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, userId));
    if (!profile) return { ...staffData, vehicleAssignments: [], projectAssignments: [], stats: null, recentLogs: [] };

    const profileId = profile.id;

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const today = now.toISOString().split("T")[0];

    const [vaRows, paRows, statsRow, recentLogs] = await Promise.all([
      // Active vehicle assignments
      tx
        .select({
          id: vehicleAssignments.id,
          vehicleId: vehicleAssignments.vehicleId,
          vehicleName: vehicles.name,
          vehicleType: vehicles.vehicleType,
          registrationNumber: vehicles.registrationNumber,
          isPrimary: vehicleAssignments.isPrimary,
          assignedFrom: vehicleAssignments.assignedFrom,
          assignedTo: vehicleAssignments.assignedTo,
          reason: vehicleAssignments.reason,
        })
        .from(vehicleAssignments)
        .innerJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
        .where(
          and(
            eq(vehicleAssignments.staffId, profileId),
            eq(vehicleAssignments.isActive, true)
          )
        ),

      // Active project assignments
      tx
        .select({
          id: projectAssignments.id,
          projectId: projectAssignments.projectId,
          projectName: projects.name,
          clientName: projects.clientName,
          assignedFrom: projectAssignments.assignedFrom,
          assignedTo: projectAssignments.assignedTo,
        })
        .from(projectAssignments)
        .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
        .where(
          and(
            eq(projectAssignments.staffId, profileId),
            eq(projectAssignments.isActive, true)
          )
        ),

      // Monthly work stats
      tx
        .select({
          totalHours: sql<string>`COALESCE(SUM(${dailyLogs.endEngineHours} - ${dailyLogs.startEngineHours}), 0)`,
          totalFuel: sql<string>`COALESCE(SUM(${dailyLogs.fuelUsedLiters}), 0)`,
          totalLogs: sql<string>`COUNT(*)`,
          totalAcres: sql<string>`COALESCE(SUM(${dailyLogs.acresWorked}), 0)`,
          totalKm: sql<string>`COALESCE(SUM(${dailyLogs.kmTraveled}), 0)`,
        })
        .from(dailyLogs)
        .where(
          and(
            eq(dailyLogs.operatorId, profileId),
            sql`${dailyLogs.date} >= ${monthStart}`,
            sql`${dailyLogs.date} <= ${today}`,
            sql`${dailyLogs.endEngineHours} IS NOT NULL`
          )
        ),

      // Recent 10 logs
      tx
        .select({
          id: dailyLogs.id,
          date: dailyLogs.date,
          vehicleName: vehicles.name,
          vehicleType: vehicles.vehicleType,
          startEngineHours: dailyLogs.startEngineHours,
          endEngineHours: dailyLogs.endEngineHours,
          fuelUsedLiters: dailyLogs.fuelUsedLiters,
          kmTraveled: dailyLogs.kmTraveled,
          acresWorked: dailyLogs.acresWorked,
          syncStatus: dailyLogs.syncStatus,
          projectId: dailyLogs.projectId,
        })
        .from(dailyLogs)
        .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
        .where(eq(dailyLogs.operatorId, profileId))
        .orderBy(desc(dailyLogs.date))
        .limit(10),
    ]);

    return {
      ...staffData,
      vehicleAssignments: vaRows,
      projectAssignments: paRows,
      stats: statsRow[0]
        ? {
            totalHours: Number(statsRow[0].totalHours),
            totalFuel: Number(statsRow[0].totalFuel),
            totalLogs: Number(statsRow[0].totalLogs),
            totalAcres: Number(statsRow[0].totalAcres),
            totalKm: Number(statsRow[0].totalKm),
          }
        : null,
      recentLogs,
    };
  });
}

export async function getStaffWorkHistory(
  userId: string,
  page = 1,
  pageSize = 20
) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  return withRLS(session.userId, session.role, async (tx) => {
    const [profile] = await tx
      .select({ id: staffProfiles.id })
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, userId));
    if (!profile) return [];

    return tx
      .select({
        id: dailyLogs.id,
        date: dailyLogs.date,
        vehicleName: vehicles.name,
        vehicleType: vehicles.vehicleType,
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
      .where(eq(dailyLogs.operatorId, profile.id))
      .orderBy(desc(dailyLogs.date))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  });
}
