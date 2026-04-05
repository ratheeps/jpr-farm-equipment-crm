"use server";

import { db } from "@/db";
import { dailyLogs, staffProfiles, vehicles, projects, projectAssignments, vehicleAssignments } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { eq, and, desc, isNotNull, isNull, or, lte, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { validateStartLog, validateEndLog } from "@/lib/validations";

async function getStaffProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, userId));
  return profile ?? null;
}

export async function getTodayLog() {
  const session = await requireSession();
  const profile = await getStaffProfile(session.userId);
  if (!profile) return null;

  const today = new Date().toISOString().split("T")[0];

  // Only return the active (not yet ended) log
  const [log] = await db
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
}

/** All completed work sessions for today — shown as a summary list below the active log form */
export async function getTodayCompletedLogs() {
  const session = await requireSession();
  const profile = await getStaffProfile(session.userId);
  if (!profile) return [];

  const today = new Date().toISOString().split("T")[0];

  return db
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
}

export async function startLog(data: {
  vehicleId: string;
  projectId?: string;
  startEngineHours: string;
  gpsLatStart?: string;
  gpsLngStart?: string;
}) {
  const session = await requireSession();
  const profile = await getStaffProfile(session.userId);
  if (!profile) throw new Error("No staff profile found");

  const validated = validateStartLog(data);

  const today = new Date().toISOString().split("T")[0];

  // Block only if an active (un-ended) log already exists
  const [existing] = await db
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

  const [log] = await db
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
  }
) {
  const session = await requireSession();
  const profile = await getStaffProfile(session.userId);
  if (!profile) throw new Error("No staff profile found");

  const validated = validateEndLog(data);

  // Fetch the current log to validate end > start engine hours and fuel sanity
  const [currentLog] = await db
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
    const [vehicleRow] = await db
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

  await db
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
      updatedAt: new Date(),
    })
    .where(
      and(eq(dailyLogs.id, logId), eq(dailyLogs.operatorId, profile.id))
    );

  revalidatePath("/operator/log");
  revalidatePath("/operator/history");
  revalidatePath("/operator");
}

export async function getLogHistory(limit = 30) {
  const session = await requireSession();
  const profile = await getStaffProfile(session.userId);
  if (!profile) return [];

  return db
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
}

export async function getActiveVehicles() {
  return db
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
    .orderBy(vehicles.name);
}

export async function getActiveProjects() {
  return db
    .select({
      id: projects.id,
      clientName: projects.clientName,
      siteLocation: projects.siteLocationText,
    })
    .from(projects)
    .where(eq(projects.status, "active"))
    .orderBy(projects.clientName);
}

/** Returns only active projects assigned to the currently logged-in operator (directly or via vehicle date range) */
export async function getMyAssignedProjects() {
  const session = await requireSession();

  const [profile] = await db
    .select({ id: staffProfiles.id })
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, session.userId));

  if (!profile) return [];

  const today = new Date().toISOString().split("T")[0];

  // Get vehicle IDs currently assigned to this operator
  const myVehicleRows = await db
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

  const rows = await db
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
}

/**
 * Returns the ending engine hours from the most recent completed log for a vehicle.
 * Used to pre-fill the start engine hours when an operator begins a new shift.
 */
export async function getLastEndEngineHours(vehicleId: string): Promise<string | null> {
  await requireSession();
  const [row] = await db
    .select({ endEngineHours: dailyLogs.endEngineHours })
    .from(dailyLogs)
    .where(and(eq(dailyLogs.vehicleId, vehicleId), isNotNull(dailyLogs.endEngineHours)))
    .orderBy(desc(dailyLogs.date), desc(dailyLogs.endTime))
    .limit(1);
  return row?.endEngineHours ?? null;
}
