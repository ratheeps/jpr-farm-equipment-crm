import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { dailyLogs, staffProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { OfflineLog } from "@/lib/offline/db";
import { validateCsrf } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select({ id: staffProfiles.id })
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, session.userId));

  if (!profile) {
    return NextResponse.json({ error: "No staff profile" }, { status: 403 });
  }

  const record = (await request.json()) as OfflineLog;

  if (record.action === "start") {
    // Check for existing log by deviceId (idempotent)
    if (record.deviceId) {
      const [existing] = await db
        .select({ id: dailyLogs.id })
        .from(dailyLogs)
        .where(eq(dailyLogs.clientDeviceId, record.deviceId));
      if (existing) {
        return NextResponse.json({ id: existing.id });
      }
    }

    const [log] = await db
      .insert(dailyLogs)
      .values({
        vehicleId: record.vehicleId,
        operatorId: profile.id,
        projectId: record.projectId ?? null,
        date: record.date,
        startEngineHours: String(record.startEngineHours),
        startTime: record.startTime ? new Date(record.startTime) : new Date(),
        gpsLatStart: record.gpsLatStart ? String(record.gpsLatStart) : null,
        gpsLngStart: record.gpsLngStart ? String(record.gpsLngStart) : null,
        syncStatus: "synced",
        clientDeviceId: record.deviceId,
      })
      .returning({ id: dailyLogs.id });

    return NextResponse.json({ id: log.id });
  }

  if (record.action === "end" && record.serverId) {
    await db
      .update(dailyLogs)
      .set({
        endEngineHours: record.endEngineHours
          ? String(record.endEngineHours)
          : null,
        endTime: record.endTime ? new Date(record.endTime) : new Date(),
        fuelUsedLiters: record.fuelUsedLiters
          ? String(record.fuelUsedLiters)
          : null,
        kmTraveled: record.kmTraveled ? String(record.kmTraveled) : null,
        acresWorked: record.acresWorked ? String(record.acresWorked) : null,
        gpsLatEnd: record.gpsLatEnd ? String(record.gpsLatEnd) : null,
        gpsLngEnd: record.gpsLngEnd ? String(record.gpsLngEnd) : null,
        notes: record.notes ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dailyLogs.id, record.serverId),
          eq(dailyLogs.operatorId, profile.id)
        )
      );

    return NextResponse.json({ id: record.serverId });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
