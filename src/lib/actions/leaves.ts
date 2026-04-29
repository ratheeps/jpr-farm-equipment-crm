"use server";

import { withRLS, type DB } from "@/db";
import { staffLeaves, staffProfiles, users } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { validateLeave } from "@/lib/validations";

export async function requestLeave(data: {
  staffId?: string; // if admin creates on behalf
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) {
  const session = await requireSession();

  const validated = validateLeave(data);

  if (validated.startDate > validated.endDate) {
    throw new Error("Start date cannot be after end date");
  }

  await withRLS(session.userId, session.role, async (tx) => {
    let targetStaffId: string;

    if (data.staffId && isRole(session, "super_admin", "admin")) {
      // Admin creating leave for a staff member
      const [profile] = await tx
        .select({ id: staffProfiles.id })
        .from(staffProfiles)
        .where(eq(staffProfiles.id, data.staffId));
      if (!profile) throw new Error("Staff not found");
      targetStaffId = profile.id;
    } else {
      // Operator self-service
      const [profile] = await tx
        .select({ id: staffProfiles.id })
        .from(staffProfiles)
        .where(eq(staffProfiles.userId, session.userId));
      if (!profile) throw new Error("Staff profile not found");
      targetStaffId = profile.id;
    }

    const [leave] = await tx
      .insert(staffLeaves)
      .values({
        staffId: targetStaffId,
        leaveType: validated.leaveType as never,
        startDate: validated.startDate,
        endDate: validated.endDate,
        reason: validated.reason ?? null,
        status: "pending",
      })
      .returning({ id: staffLeaves.id });

    await logAudit(tx, "create", "staff_leaves", leave.id, session.userId, undefined, {
      staffId: targetStaffId,
      leaveType: validated.leaveType,
    });
  });

  revalidatePath("/admin/staff/leaves");
  revalidatePath("/operator/leave");
}

export async function approveLeave(leaveId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  await withRLS(session.userId, session.role, async (tx) => {
    await tx
      .update(staffLeaves)
      .set({
        status: "approved",
        approvedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(staffLeaves.id, leaveId));

    await logAudit(tx, "update", "staff_leaves", leaveId, session.userId);
  });

  revalidatePath("/admin/staff/leaves");
}

export async function rejectLeave(leaveId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  await withRLS(session.userId, session.role, async (tx) => {
    await tx
      .update(staffLeaves)
      .set({
        status: "rejected",
        approvedBy: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(staffLeaves.id, leaveId));

    await logAudit(tx, "update", "staff_leaves", leaveId, session.userId);
  });

  revalidatePath("/admin/staff/leaves");
}

export async function getLeaves(filters?: {
  staffId?: string;
  status?: string;
}) {
  const session = await requireSession();

  return withRLS(session.userId, session.role, async (tx) => {
    // Operators can only see their own leaves
    if (!isRole(session, "super_admin", "admin")) {
      const [profile] = await tx
        .select({ id: staffProfiles.id })
        .from(staffProfiles)
        .where(eq(staffProfiles.userId, session.userId));
      if (!profile) return [];

      return tx
        .select({
          id: staffLeaves.id,
          leaveType: staffLeaves.leaveType,
          startDate: staffLeaves.startDate,
          endDate: staffLeaves.endDate,
          reason: staffLeaves.reason,
          status: staffLeaves.status,
          createdAt: staffLeaves.createdAt,
          staffName: staffProfiles.fullName,
        })
        .from(staffLeaves)
        .innerJoin(staffProfiles, eq(staffLeaves.staffId, staffProfiles.id))
        .where(eq(staffLeaves.staffId, profile.id))
        .orderBy(staffLeaves.createdAt);
    }

    // Admin/owner sees all leaves, optionally filtered
    const conditions = [];
    if (filters?.staffId) conditions.push(eq(staffLeaves.staffId, filters.staffId));
    if (filters?.status) conditions.push(eq(staffLeaves.status, filters.status as never));

    return tx
      .select({
        id: staffLeaves.id,
        staffId: staffLeaves.staffId,
        leaveType: staffLeaves.leaveType,
        startDate: staffLeaves.startDate,
        endDate: staffLeaves.endDate,
        reason: staffLeaves.reason,
        status: staffLeaves.status,
        createdAt: staffLeaves.createdAt,
        staffName: staffProfiles.fullName,
        staffPhone: staffProfiles.phone,
      })
      .from(staffLeaves)
      .innerJoin(staffProfiles, eq(staffLeaves.staffId, staffProfiles.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(staffLeaves.createdAt);
  });
}

/** Returns operating staff members and whether they are on approved leave for a given date */
export async function getStaffAvailability(date: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  return withRLS(session.userId, session.role, async (tx) => {
    const allStaff = await tx
      .select({
        staffProfileId: staffProfiles.id,
        fullName: staffProfiles.fullName,
        userId: users.id,
      })
      .from(staffProfiles)
      .innerJoin(users, eq(staffProfiles.userId, users.id))
      .where(and(eq(users.isActive, true), eq(users.role, "operator")));

    // Leaves that overlap the given date
    const onLeave = await tx
      .select({ staffId: staffLeaves.staffId })
      .from(staffLeaves)
      .where(
        and(
          eq(staffLeaves.status, "approved"),
          lte(staffLeaves.startDate, date),
          gte(staffLeaves.endDate, date)
        )
      );

    const onLeaveSet = new Set(onLeave.map((l) => l.staffId));

    return allStaff.map((s) => ({
      ...s,
      onLeave: onLeaveSet.has(s.staffProfileId),
    }));
  });
}
