"use server";

import { db } from "@/db";
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
import { validateStaff } from "@/lib/validations";
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

export async function createStaff(data: StaffFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const validated = validateStaff(data);
  if (!validated.password) throw new Error("Password is required");
  if (validated.password.length < 6)
    throw new Error("Password must be at least 6 characters");

  const passwordHash = await hashPassword(validated.password);

  const [user] = await db
    .insert(users)
    .values({
      phone: validated.phone,
      passwordHash,
      role: validated.role as never,
      preferredLocale: validated.preferredLocale as never,
    })
    .returning({ id: users.id });

  await db.insert(staffProfiles).values({
    userId: user.id,
    fullName: validated.fullName,
    phone: validated.staffPhone ?? validated.phone,
    nicNumber: validated.nicNumber ?? null,
    payRate: validated.payRate ?? null,
    payType: validated.payType as never,
  });

  await logAudit(null, "create", "users", user.id, session.userId, undefined, { phone: validated.phone, role: validated.role });

  revalidatePath("/admin/staff");
}

export async function updateStaff(userId: string, data: Omit<StaffFormData, "password">) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db
    .update(users)
    .set({
      role: data.role as never,
      preferredLocale: data.preferredLocale as never,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await db
    .update(staffProfiles)
    .set({
      fullName: data.fullName,
      phone: data.staffPhone || data.phone,
      nicNumber: data.nicNumber || null,
      payRate: data.payRate || null,
      payType: data.payType as never,
      updatedAt: new Date(),
    })
    .where(eq(staffProfiles.userId, userId));

  await logAudit(null, "update", "users", userId, session.userId);

  revalidatePath("/admin/staff");
}

export async function getStaffList() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  return db
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
}

export async function getStaff(userId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const results = await db
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

export async function deactivateStaff(userId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin")) {
    throw new Error("Forbidden");
  }

  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await logAudit(null, "deactivate", "users", userId, session.userId);

  revalidatePath("/admin/staff");
}

// ─── Enriched staff profile with assignments and work stats ──────────────────

export async function getStaffProfileDetails(userId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  const staffData = await getStaff(userId);
  if (!staffData) return null;

  // Staff profile ID (not userId)
  const [profile] = await db
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
    db
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
    db
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
    db
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
    db
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
}

export async function getStaffWorkHistory(
  userId: string,
  page = 1,
  pageSize = 20
) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  const [profile] = await db
    .select({ id: staffProfiles.id })
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, userId));
  if (!profile) return [];

  return db
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
}
