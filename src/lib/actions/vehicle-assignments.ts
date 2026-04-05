"use server";

import { db } from "@/db";
import {
  vehicleAssignments,
  staffProfiles,
  vehicles,
  users,
} from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { validateVehicleAssignment } from "@/lib/validations";

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Returns all active vehicle assignments for a given vehicle with staff details */
export async function getVehicleAssignments(vehicleId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  return db
    .select({
      id: vehicleAssignments.id,
      vehicleId: vehicleAssignments.vehicleId,
      staffId: vehicleAssignments.staffId,
      staffName: staffProfiles.fullName,
      staffPhone: staffProfiles.phone,
      isPrimary: vehicleAssignments.isPrimary,
      assignedFrom: vehicleAssignments.assignedFrom,
      assignedTo: vehicleAssignments.assignedTo,
      reason: vehicleAssignments.reason,
      isActive: vehicleAssignments.isActive,
    })
    .from(vehicleAssignments)
    .innerJoin(staffProfiles, eq(vehicleAssignments.staffId, staffProfiles.id))
    .where(
      and(
        eq(vehicleAssignments.vehicleId, vehicleId),
        eq(vehicleAssignments.isActive, true)
      )
    )
    .orderBy(vehicleAssignments.isPrimary);
}

/** Returns all active vehicle assignments for a given staff profile */
export async function getStaffAssignments(staffProfileId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  return db
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
        eq(vehicleAssignments.staffId, staffProfileId),
        eq(vehicleAssignments.isActive, true)
      )
    );
}

/** Returns the primary vehicle assignment for the currently logged-in operator */
export async function getMyVehicleAssignment() {
  const session = await requireSession();

  const [profile] = await db
    .select({ id: staffProfiles.id })
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, session.userId));

  if (!profile) return null;

  const [assignment] = await db
    .select({
      vehicleId: vehicleAssignments.vehicleId,
      vehicleName: vehicles.name,
      vehicleType: vehicles.vehicleType,
      registrationNumber: vehicles.registrationNumber,
    })
    .from(vehicleAssignments)
    .innerJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
    .where(
      and(
        eq(vehicleAssignments.staffId, profile.id),
        eq(vehicleAssignments.isPrimary, true),
        eq(vehicleAssignments.isActive, true)
      )
    )
    .limit(1);

  return assignment ?? null;
}

/** Returns all vehicles actively assigned to the currently logged-in operator */
export async function getMyAssignedVehicles() {
  const session = await requireSession();

  const [profile] = await db
    .select({ id: staffProfiles.id })
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, session.userId));

  if (!profile) return [];

  return db
    .select({
      id: vehicles.id,
      name: vehicles.name,
      registrationNumber: vehicles.registrationNumber,
      vehicleType: vehicles.vehicleType,
      billingModel: vehicles.billingModel,
      currentEngineHours: vehicles.currentEngineHours,
    })
    .from(vehicleAssignments)
    .innerJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
    .where(
      and(
        eq(vehicleAssignments.staffId, profile.id),
        eq(vehicleAssignments.isActive, true)
      )
    )
    .orderBy(vehicleAssignments.isPrimary);
}

/** Returns all active operator-role staff with their current primary assignment */
export async function getAvailableOperators() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  const allOperators = await db
    .select({
      staffProfileId: staffProfiles.id,
      fullName: staffProfiles.fullName,
      phone: staffProfiles.phone,
      userId: users.id,
      role: users.role,
    })
    .from(staffProfiles)
    .innerJoin(users, eq(staffProfiles.userId, users.id))
    .where(and(eq(users.isActive, true), eq(users.role, "operator")));

  // Fetch their current primary assignments separately to avoid complex join
  const primaryAssignments = await db
    .select({
      staffId: vehicleAssignments.staffId,
      vehicleName: vehicles.name,
    })
    .from(vehicleAssignments)
    .innerJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
    .where(
      and(
        eq(vehicleAssignments.isPrimary, true),
        eq(vehicleAssignments.isActive, true)
      )
    );

  const assignmentMap = new Map(
    primaryAssignments.map((a) => [a.staffId, a.vehicleName])
  );

  return allOperators.map((op) => ({
    ...op,
    currentVehicle: assignmentMap.get(op.staffProfileId) ?? null,
  }));
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function assignOperatorToVehicle(data: {
  vehicleId: string;
  staffId: string;
  assignedFrom: string;
  assignedTo?: string;
  isPrimary?: boolean;
  reason?: string;
}) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  const validated = validateVehicleAssignment(data);

  // If this is a primary assignment, deactivate existing primary for this vehicle
  if (validated.isPrimary) {
    await db
      .update(vehicleAssignments)
      .set({ isActive: false })
      .where(
        and(
          eq(vehicleAssignments.vehicleId, validated.vehicleId),
          eq(vehicleAssignments.isPrimary, true),
          eq(vehicleAssignments.isActive, true)
        )
      );
  }

  const [row] = await db
    .insert(vehicleAssignments)
    .values({
      vehicleId: validated.vehicleId,
      staffId: validated.staffId,
      assignedFrom: validated.assignedFrom,
      assignedTo: validated.assignedTo ?? null,
      isPrimary: validated.isPrimary,
      reason: validated.reason ?? null,
      isActive: true,
    })
    .returning({ id: vehicleAssignments.id });

  await logAudit(
    "create",
    "vehicle_assignments",
    row.id,
    session.userId,
    undefined,
    {
      vehicleId: validated.vehicleId,
      staffId: validated.staffId,
      isPrimary: validated.isPrimary,
    }
  );

  revalidatePath("/admin/vehicles");
}

export async function removeVehicleAssignment(assignmentId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  await db
    .update(vehicleAssignments)
    .set({ isActive: false })
    .where(eq(vehicleAssignments.id, assignmentId));

  await logAudit(
    "deactivate",
    "vehicle_assignments",
    assignmentId,
    session.userId
  );

  revalidatePath("/admin/vehicles");
}
