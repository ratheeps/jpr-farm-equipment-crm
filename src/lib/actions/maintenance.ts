"use server";

import { withRLS } from "@/db";
import type { DB } from "@/db";
import {
  maintenanceRecords,
  maintenanceSchedules,
  vehicles,
} from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type MaintenanceRecordData = {
  type: string;
  serviceDate: string;
  engineHoursAtService?: number;
  nextServiceDueHours?: number;
  performedBy?: string;
  cost?: number;
  description?: string;
};

export type MaintenanceScheduleData = {
  type: string;
  intervalHours: number;
  lastServiceHours?: number;
};

// ─── Internal helper ────────────────────────────────────────────────────────

async function refreshScheduleOverdue(
  tx: DB,
  vehicleId: string,
  currentEngineHours: number
) {
  const schedules = await tx
    .select()
    .from(maintenanceSchedules)
    .where(eq(maintenanceSchedules.vehicleId, vehicleId));

  for (const s of schedules) {
    const nextDue = Number(s.nextDueHours ?? 0);
    const newIsOverdue = nextDue <= currentEngineHours;
    if (newIsOverdue !== s.isOverdue) {
      await tx
        .update(maintenanceSchedules)
        .set({ isOverdue: newIsOverdue, updatedAt: new Date() })
        .where(eq(maintenanceSchedules.id, s.id));
    }
  }
}

// ─── Records ────────────────────────────────────────────────────────────────

export async function getMaintenanceRecords(vehicleId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }
  return withRLS(session.userId, session.role, async (tx) =>
    tx
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.vehicleId, vehicleId))
      .orderBy(maintenanceRecords.serviceDate)
  );
}

export async function createMaintenanceRecord(
  vehicleId: string,
  data: MaintenanceRecordData
) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await withRLS(session.userId, session.role, async (tx) => {
    await tx.insert(maintenanceRecords).values({
      vehicleId,
      type: data.type,
      serviceDate: data.serviceDate,
      engineHoursAtService: data.engineHoursAtService?.toString() ?? null,
      nextServiceDueHours: data.nextServiceDueHours?.toString() ?? null,
      performedBy: data.performedBy ?? null,
      cost: data.cost?.toString() ?? null,
      description: data.description ?? null,
    });

    // Recalculate schedule overdue status
    const [vehicle] = await tx
      .select({ currentEngineHours: vehicles.currentEngineHours })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (vehicle) {
      await refreshScheduleOverdue(tx, vehicleId, Number(vehicle.currentEngineHours));
    }
  });

  revalidatePath(`/admin/vehicles/${vehicleId}`);
  revalidatePath("/admin/maintenance");
}

export async function deleteMaintenanceRecord(id: string, vehicleId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin")) {
    throw new Error("Forbidden");
  }

  await withRLS(session.userId, session.role, async (tx) => {
    await tx
      .delete(maintenanceRecords)
      .where(
        and(eq(maintenanceRecords.id, id), eq(maintenanceRecords.vehicleId, vehicleId))
      );

    const [vehicle] = await tx
      .select({ currentEngineHours: vehicles.currentEngineHours })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    if (vehicle) {
      await refreshScheduleOverdue(tx, vehicleId, Number(vehicle.currentEngineHours));
    }
  });

  revalidatePath(`/admin/vehicles/${vehicleId}`);
  revalidatePath("/admin/maintenance");
}

// ─── Schedules ───────────────────────────────────────────────────────────────

export async function getMaintenanceSchedules(vehicleId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }
  return withRLS(session.userId, session.role, async (tx) =>
    tx
      .select()
      .from(maintenanceSchedules)
      .where(eq(maintenanceSchedules.vehicleId, vehicleId))
      .orderBy(maintenanceSchedules.type)
  );
}

export async function createMaintenanceSchedule(
  vehicleId: string,
  data: MaintenanceScheduleData
) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const lastHrs = data.lastServiceHours ?? 0;
  const nextDueHours = lastHrs + data.intervalHours;

  await withRLS(session.userId, session.role, async (tx) => {
    const [vehicle] = await tx
      .select({ currentEngineHours: vehicles.currentEngineHours })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);

    const isOverdue = vehicle
      ? nextDueHours <= Number(vehicle.currentEngineHours)
      : false;

    await tx.insert(maintenanceSchedules).values({
      vehicleId,
      type: data.type,
      intervalHours: data.intervalHours,
      lastServiceHours: lastHrs > 0 ? lastHrs.toString() : null,
      nextDueHours: nextDueHours.toString(),
      isOverdue,
    });
  });

  revalidatePath(`/admin/vehicles/${vehicleId}`);
  revalidatePath("/admin/maintenance");
}

export async function deleteMaintenanceSchedule(id: string, vehicleId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin")) {
    throw new Error("Forbidden");
  }

  await withRLS(session.userId, session.role, async (tx) => {
    await tx
      .delete(maintenanceSchedules)
      .where(
        and(
          eq(maintenanceSchedules.id, id),
          eq(maintenanceSchedules.vehicleId, vehicleId)
        )
      );
  });

  revalidatePath(`/admin/vehicles/${vehicleId}`);
  revalidatePath("/admin/maintenance");
}

// ─── Overview (for admin/maintenance page) ───────────────────────────────────

export async function getMaintenanceOverview() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx) => {
    const allVehicles = await tx
      .select()
      .from(vehicles)
      .orderBy(vehicles.name);

    const allSchedules = await tx
      .select()
      .from(maintenanceSchedules)
      .orderBy(maintenanceSchedules.type);

    return allVehicles.map((v) => ({
      id: v.id,
      name: v.name,
      registrationNumber: v.registrationNumber,
      currentEngineHours: v.currentEngineHours,
      status: v.status,
      schedules: allSchedules.filter((s) => s.vehicleId === v.id),
    }));
  });
}
