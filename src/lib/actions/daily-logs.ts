"use server";

import { db } from "@/db";
import { dailyLogs, staffProfiles, vehicles, projects } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
      and(eq(dailyLogs.operatorId, profile.id), eq(dailyLogs.date, today))
    );

  return log ?? null;
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

  const today = new Date().toISOString().split("T")[0];

  // Check no log for today already
  const [existing] = await db
    .select({ id: dailyLogs.id })
    .from(dailyLogs)
    .where(
      and(eq(dailyLogs.operatorId, profile.id), eq(dailyLogs.date, today))
    );
  if (existing) throw new Error("A log already exists for today");

  const [log] = await db
    .insert(dailyLogs)
    .values({
      vehicleId: data.vehicleId,
      operatorId: profile.id,
      projectId: data.projectId ?? null,
      date: today,
      startEngineHours: data.startEngineHours,
      startTime: new Date(),
      gpsLatStart: data.gpsLatStart ?? null,
      gpsLngStart: data.gpsLngStart ?? null,
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

  await db
    .update(dailyLogs)
    .set({
      endEngineHours: data.endEngineHours,
      endTime: new Date(),
      fuelUsedLiters: data.fuelUsedLiters || null,
      kmTraveled: data.kmTraveled || null,
      acresWorked: data.acresWorked || null,
      gpsLatEnd: data.gpsLatEnd || null,
      gpsLngEnd: data.gpsLngEnd || null,
      notes: data.notes || null,
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
