"use server";

import { withRLS, type DB } from "@/db";
import { staffSchedules, staffProfiles, vehicles, projects, users } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { validateSchedule } from "@/lib/validations";

export async function createSchedule(data: {
  staffId: string;
  vehicleId?: string;
  projectId?: string;
  date: string;
  shiftType: string;
  notes?: string;
}) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  const validated = validateSchedule(data);

  await withRLS(session.userId, session.role, async (tx) => {
    await tx.insert(staffSchedules).values({
      staffId: validated.staffId,
      vehicleId: validated.vehicleId ?? null,
      projectId: validated.projectId ?? null,
      date: validated.date,
      shiftType: validated.shiftType as never,
      notes: validated.notes ?? null,
    });
  });

  revalidatePath("/admin/staff/schedule");
}

export async function deleteSchedule(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  await withRLS(session.userId, session.role, async (tx) => {
    await tx.delete(staffSchedules).where(eq(staffSchedules.id, id));
  });

  revalidatePath("/admin/staff/schedule");
}

export async function getSchedule(dateFrom: string, dateTo: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  return withRLS(session.userId, session.role, async (tx) => {
    return tx
      .select({
        id: staffSchedules.id,
        staffId: staffSchedules.staffId,
        staffName: staffProfiles.fullName,
        vehicleId: staffSchedules.vehicleId,
        vehicleName: vehicles.name,
        projectId: staffSchedules.projectId,
        projectName: projects.name,
        date: staffSchedules.date,
        shiftType: staffSchedules.shiftType,
        notes: staffSchedules.notes,
      })
      .from(staffSchedules)
      .innerJoin(staffProfiles, eq(staffSchedules.staffId, staffProfiles.id))
      .leftJoin(vehicles, eq(staffSchedules.vehicleId, vehicles.id))
      .leftJoin(projects, eq(staffSchedules.projectId, projects.id))
      .where(
        and(
          gte(staffSchedules.date, dateFrom),
          lte(staffSchedules.date, dateTo)
        )
      )
      .orderBy(staffSchedules.date, staffProfiles.fullName);
  });
}

/** Returns all active operators and any vehicles for the schedule form */
export async function getScheduleFormData() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) throw new Error("Forbidden");

  return withRLS(session.userId, session.role, async (tx) => {
    const [allStaff, allVehicles, allProjects] = await Promise.all([
      tx
        .select({
          id: staffProfiles.id,
          fullName: staffProfiles.fullName,
        })
        .from(staffProfiles)
        .innerJoin(users, eq(staffProfiles.userId, users.id))
        .where(and(eq(users.isActive, true), eq(users.role, "operator"))),

      tx
        .select({ id: vehicles.id, name: vehicles.name })
        .from(vehicles)
        .where(eq(vehicles.status, "active")),

      tx
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(eq(projects.status, "active")),
    ]);

    return { staff: allStaff, vehicles: allVehicles, projects: allProjects };
  });
}
