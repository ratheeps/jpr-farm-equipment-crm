"use server";

import { db, withRLS, type DB } from "@/db";
import { dailyLogs, staffProfiles, vehicles, projects, projectAssignments, vehicleAssignments } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { eq, and, desc, isNotNull, isNull, or, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { validateStartLog, validateEndLog } from "@/lib/validations";

async function getStaffProfile(tx: DB, userId: string) {
  const [profile] = await tx
    .select()
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, userId));
  return profile ?? null;
}

export async function getTodayLog() {
  const session = await requireSession();

  return withRLS(session.userId, session.role, async (tx) => {
    const profile = await getStaffProfile(tx, session.userId);
    if (!profile) return null;

    const today = new Date().toISOString().split("T")[0];

    // Only return the active (not yet ended) log
    const [log] = await tx
      .select({
        id: dailyLogs.id,
        date: dailyLogs.date,
        startTime: dailyLogs.startTime,
        endTime: dailyLogs.endTime,
        startEngineHours: dailyLogs.startEngineHours,
        endEngineHours: dailyLogs.endEngineHours,
        fuelUsedLiters: dailyLogs.fuelUsedLiters,
        kmTraveled: dailyLogs.kmTraveled,
        acresWorked: dailyLogs.acresWorked,
        gpsLatStart: dailyLogs.gpsLatStart,
        gpsLngStart: dailyLogs.gpsLngStart,
        notes: dailyLogs.notes,
        syncStatus: dailyLogs.syncStatus,
        vehicleId: dailyLogs.vehicleId,
        vehicleName: vehicles.name,
        vehicleType: vehicles.vehicleType,
        billingModel: vehicles.billingModel,
        projectId: dailyLogs.projectId,
      })
      .from(dailyLogs)
      .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
      .where(
        and(
          eq(dailyLogs.operatorId, profile.id),
          eq(dailyLogs.date, today),
          isNull(dailyLogs.endTime)
        )
      )
      .limit(1);

    return log ?? null;
  });
}

/** All completed work sessions for today — shown as a summary list below the active log form */
export async function getTodayCompletedLogs() {
  const session = await requireSession();

  return withRLS(session.userId, session.role, async (tx) => {
    const profile = await getStaffProfile(tx, session.userId);
    if (!profile) return [];

    const today = new Date().toISOString().split("T")[0];

    return tx
      .select({
        id: dailyLogs.id,
        startEngineHours: dailyLogs.startEngineHours,
        endEngineHours: dailyLogs.endEngineHours,
        startTime: dailyLogs.startTime,
        endTime: dailyLogs.endTime,
        vehicleName: vehicles.name,
      })
      .from(dailyLogs)
      .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
      .where(
        and(
          eq(dailyLogs.operatorId, profile.id),
          eq(dailyLogs.date, today),
          isNotNull(dailyLogs.endTime)
        )
      )
      .orderBy(desc(dailyLogs.startTime));
  });
}

export async function startLog(data: {
  vehicleId: string;
  projectId?: string;
  startEngineHours: string;
  gpsLatStart?: string;
  gpsLngStart?: string;
}) {
  const session = await requireSession();

  const validated = validateStartLog(data);
  const today = new Date().toISOString().split("T")[0];

  return withRLS(session.userId, session.role, async (tx) => {
    const profile = await getStaffProfile(tx, session.userId);
    if (!profile) throw new Error("No staff profile found");

    // Block only if an active (un-ended) log already exists
    const [existing] = await tx
      .select({ id: dailyLogs.id })
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.operatorId, profile.id),
          eq(dailyLogs.date, today),
          isNull(dailyLogs.endTime)
        )
      );
    if (existing) throw new Error("An active log already exists. End it before starting a new one.");

    const [log] = await tx
      .insert(dailyLogs)
      .values({
        vehicleId: validated.vehicleId,
        operatorId: profile.id,
        projectId: validated.projectId ?? null,
        date: today,
        startEngineHours: validated.startEngineHours,
        startTime: new Date(),
        gpsLatStart: validated.gpsLatStart ?? null,
        gpsLngStart: validated.gpsLngStart ?? null,
        syncStatus: "synced",
      })
      .returning();

    revalidatePath("/operator/log");
    revalidatePath("/operator");
    return log;
  });
}

export async function endLog(
  logId: string,
  data: {
    endEngineHours: string;
    fuelUsedLiters?: string;
    kmTraveled?: string;
    acresWorked?: string;
    gpsLatEnd?: string;
    gpsLngEnd?: string;
    notes?: string;
    tripAllowanceOverride?: string;
  }
) {
  const session = await requireSession();

  const validated = validateEndLog(data);

  return withRLS(session.userId, session.role, async (tx) => {
    const profile = await getStaffProfile(tx, session.userId);
    if (!profile) throw new Error("No staff profile found");

    // Fetch the current log to validate end > start engine hours and fuel sanity
    const [currentLog] = await tx
      .select({
        startEngineHours: dailyLogs.startEngineHours,
        vehicleId: dailyLogs.vehicleId,
      })
      .from(dailyLogs)
      .where(and(eq(dailyLogs.id, logId), eq(dailyLogs.operatorId, profile.id)));

    if (
      currentLog?.startEngineHours !== null &&
      currentLog?.startEngineHours !== undefined &&
      Number(validated.endEngineHours) < Number(currentLog.startEngineHours)
    ) {
      throw new Error(
        "End engine hours cannot be less than start engine hours"
      );
    }

    // Fuel sanity check: reject if fuel > 3× baseline × hours worked
    if (validated.fuelUsedLiters && currentLog?.vehicleId) {
      const [vehicleRow] = await tx
        .select({ fuelConsumptionBaseline: vehicles.fuelConsumptionBaseline })
        .from(vehicles)
        .where(eq(vehicles.id, currentLog.vehicleId));

      const baseline = Number(vehicleRow?.fuelConsumptionBaseline ?? 0);
      const hoursWorked = currentLog.startEngineHours
        ? Number(validated.endEngineHours) - Number(currentLog.startEngineHours)
        : 0;
      const maxFuel = baseline > 0 && hoursWorked > 0 ? baseline * hoursWorked * 3 : 0;

      if (maxFuel > 0 && Number(validated.fuelUsedLiters) > maxFuel) {
        throw new Error(
          `Fuel entered (${validated.fuelUsedLiters} L) is unreasonably high for ${hoursWorked.toFixed(1)} hours worked. Please verify.`
        );
      }
    }

    await tx
      .update(dailyLogs)
      .set({
        endEngineHours: validated.endEngineHours,
        endTime: new Date(),
        fuelUsedLiters: validated.fuelUsedLiters ?? null,
        kmTraveled: validated.kmTraveled ?? null,
        acresWorked: validated.acresWorked ?? null,
        gpsLatEnd: validated.gpsLatEnd ?? null,
        gpsLngEnd: validated.gpsLngEnd ?? null,
        notes: validated.notes ?? null,
        tripAllowanceOverride: validated.tripAllowanceOverride ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(dailyLogs.id, logId), eq(dailyLogs.operatorId, profile.id))
      );

    revalidatePath("/operator/log");
    revalidatePath("/operator/history");
    revalidatePath("/operator");
  });
}

export async function getLogHistory(limit = 30) {
  const session = await requireSession();

  return withRLS(session.userId, session.role, async (tx) => {
    const profile = await getStaffProfile(tx, session.userId);
    if (!profile) return [];

    return tx
      .select({
        id: dailyLogs.id,
        date: dailyLogs.date,
        startTime: dailyLogs.startTime,
        endTime: dailyLogs.endTime,
        startEngineHours: dailyLogs.startEngineHours,
        endEngineHours: dailyLogs.endEngineHours,
        fuelUsedLiters: dailyLogs.fuelUsedLiters,
        kmTraveled: dailyLogs.kmTraveled,
        acresWorked: dailyLogs.acresWorked,
        notes: dailyLogs.notes,
        syncStatus: dailyLogs.syncStatus,
        vehicleName: vehicles.name,
        vehicleType: vehicles.vehicleType,
      })
      .from(dailyLogs)
      .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
      .where(eq(dailyLogs.operatorId, profile.id))
      .orderBy(desc(dailyLogs.date))
      .limit(limit);
  });
}

export async function getActiveVehicles() {
  const session = await requireSession();
  return withRLS(session.userId, session.role, async (tx) =>
    tx
      .select({
        id: vehicles.id,
        name: vehicles.name,
        registrationNumber: vehicles.registrationNumber,
        vehicleType: vehicles.vehicleType,
        billingModel: vehicles.billingModel,
        currentEngineHours: vehicles.currentEngineHours,
      })
      .from(vehicles)
      .where(eq(vehicles.status, "active"))
      .orderBy(vehicles.name)
  );
}

export async function getActiveProjects() {
  const session = await requireSession();
  return withRLS(session.userId, session.role, async (tx) =>
    tx
      .select({
        id: projects.id,
        clientName: projects.clientName,
        siteLocation: projects.siteLocationText,
      })
      .from(projects)
      .where(eq(projects.status, "active"))
      .orderBy(projects.clientName)
  );
}

/** Returns only active projects assigned to the currently logged-in operator (directly or via vehicle date range) */
export async function getMyAssignedProjects() {
  const session = await requireSession();

  return withRLS(session.userId, session.role, async (tx) => {
    const [profile] = await tx
      .select({ id: staffProfiles.id })
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, session.userId));

    if (!profile) return [];

    const today = new Date().toISOString().split("T")[0];

    // Get vehicle IDs currently assigned to this operator
    const myVehicleRows = await tx
      .select({ vehicleId: vehicleAssignments.vehicleId })
      .from(vehicleAssignments)
      .where(
        and(
          eq(vehicleAssignments.staffId, profile.id),
          eq(vehicleAssignments.isActive, true)
        )
      );
    const vehicleIds = myVehicleRows
      .map((r) => r.vehicleId)
      .filter((id): id is string => id !== null);

    // Build vehicle-based project conditions
    const vehicleConditions = vehicleIds.map((vid) =>
      and(
        eq(projectAssignments.vehicleId, vid),
        eq(projectAssignments.isActive, true),
        or(isNull(projectAssignments.assignedFrom), lte(projectAssignments.assignedFrom, today)),
        or(isNull(projectAssignments.assignedTo), gte(projectAssignments.assignedTo, today))
      )
    );

    const rows = await tx
      .select({
        id: projects.id,
        clientName: projects.clientName,
        siteLocation: projects.siteLocationText,
      })
      .from(projectAssignments)
      .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
      .where(
        and(
          eq(projects.status, "active"),
          or(
            // Directly assigned to this operator
            and(
              eq(projectAssignments.staffId, profile.id),
              eq(projectAssignments.isActive, true)
            ),
            // Project assigned to one of operator's vehicles within active date range
            ...(vehicleConditions.length > 0 ? vehicleConditions : [])
          )
        )
      )
      .orderBy(projects.clientName);

    // Deduplicate — same project can match both staff and vehicle assignment
    const seen = new Set<string>();
    return rows.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  });
}

/**
 * Returns the ending engine hours from the most recent completed log for a vehicle.
 * Used to pre-fill the start engine hours when an operator begins a new shift.
 */
export async function getLastEndEngineHours(vehicleId: string): Promise<string | null> {
  const session = await requireSession();

  return withRLS(session.userId, session.role, async (tx) => {
    const [row] = await tx
      .select({ endEngineHours: dailyLogs.endEngineHours })
      .from(dailyLogs)
      .where(and(eq(dailyLogs.vehicleId, vehicleId), isNotNull(dailyLogs.endEngineHours)))
      .orderBy(desc(dailyLogs.date), desc(dailyLogs.endTime))
      .limit(1);
    return row?.endEngineHours ?? null;
  });
}
