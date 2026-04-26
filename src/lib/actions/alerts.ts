"use server";

import { db } from "@/db";
import { alertEvents, pushSubscriptions, vehicles, companySettings } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { getIdlingReport, getFuelDiscrepancyReport, getMaintenanceStatusReport } from "./reports";
import { resolveThreshold } from "@/lib/alerts/thresholds";
import { sendPushNotification, type PushPayload } from "@/lib/push";

async function getCompanyDefaults() {
  const [row] = await db.select().from(companySettings).limit(1);
  return row ?? {
    defaultIdleWarnPct: null,
    defaultIdleCriticalPct: null,
    defaultFuelVariancePct: null,
  };
}

async function getVehicleThresholdMap() {
  const rows = await db
    .select({
      id: vehicles.id,
      name: vehicles.name,
      idleWarnPct: vehicles.idleWarnPct,
      idleCriticalPct: vehicles.idleCriticalPct,
      fuelVariancePct: vehicles.fuelVariancePct,
    })
    .from(vehicles);
  return new Map(rows.map((r) => [r.id, r]));
}

export async function scanAndPersistAlerts() {
  const [idlingRows, fuelRows, maintenanceRows, defaults, vehicleMap] = await Promise.all([
    getIdlingReport(),
    getFuelDiscrepancyReport(),
    getMaintenanceStatusReport(),
    getCompanyDefaults(),
    getVehicleThresholdMap(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const upserts: { type: "idling" | "fuel_anomaly" | "maintenance_overdue"; severity: "warning" | "critical"; vehicleId: string; value: number }[] = [];

  for (const row of idlingRows) {
    const v = vehicleMap.get(row.vehicleId);
    if (!v) continue;
    const critPct = resolveThreshold(v, defaults, "idleCriticalPct");
    const warnPct = resolveThreshold(v, defaults, "idleWarnPct");
    if (row.idleRatioPct >= critPct) {
      upserts.push({ type: "idling", severity: "critical", vehicleId: row.vehicleId, value: row.idleRatioPct });
    } else if (row.idleRatioPct >= warnPct) {
      upserts.push({ type: "idling", severity: "warning", vehicleId: row.vehicleId, value: row.idleRatioPct });
    }
  }

  for (const row of fuelRows) {
    if (!row.flagged) continue;
    const v = vehicleMap.get(row.vehicleId);
    if (!v) continue;
    const threshold = resolveThreshold(v, defaults, "fuelVariancePct");
    const pct = Math.abs(row.discrepancyPct ?? 0);
    if (pct >= threshold) {
      upserts.push({
        type: "fuel_anomaly",
        severity: pct >= 50 ? "critical" : "warning",
        vehicleId: row.vehicleId,
        value: row.discrepancyPct ?? 0,
      });
    }
  }

  for (const row of maintenanceRows) {
    upserts.push({
      type: "maintenance_overdue",
      severity: "critical",
      vehicleId: row.vehicleId,
      value: row.overdueCount,
    });
  }

  // Upsert using INSERT ... ON CONFLICT pattern
  for (const u of upserts) {
    await db.execute(sql`
      INSERT INTO alert_events (type, severity, vehicle_id, value, detected_date)
      VALUES (${u.type}, ${u.severity}, ${u.vehicleId}, ${u.value}, ${today})
      ON CONFLICT (type, vehicle_id, detected_date) WHERE resolved_at IS NULL
      DO UPDATE SET severity = EXCLUDED.severity, value = EXCLUDED.value, detected_at = NOW()
    `);
  }

  // Only close events for alert types that were actually scanned in this run.
  // If a report type returned data (even empty = no alerts), it was scanned successfully.
  const scannedTypes = new Set<string>();
  if (idlingRows != null) scannedTypes.add("idling");
  if (fuelRows != null) scannedTypes.add("fuel_anomaly");
  if (maintenanceRows != null) scannedTypes.add("maintenance_overdue");

  const activeVehicleIds = new Set(upserts.map((u) => `${u.type}:${u.vehicleId}`));
  const openEvents = await db
    .select({ id: alertEvents.id, type: alertEvents.type, vehicleId: alertEvents.vehicleId })
    .from(alertEvents)
    .where(isNull(alertEvents.resolvedAt));

  for (const ev of openEvents) {
    if (scannedTypes.has(ev.type) && !activeVehicleIds.has(`${ev.type}:${ev.vehicleId}`)) {
      await db.update(alertEvents)
        .set({ resolvedAt: new Date() })
        .where(eq(alertEvents.id, ev.id));
    }
  }
}

export async function sendCriticalPushes() {
  const pendingCritical = await db
    .select({
      id: alertEvents.id,
      type: alertEvents.type,
      vehicleId: alertEvents.vehicleId,
      value: alertEvents.value,
    })
    .from(alertEvents)
    .where(and(
      eq(alertEvents.severity, "critical"),
      isNull(alertEvents.pushedAt)
    ));

  if (pendingCritical.length === 0) return;

  const vehicleNames = new Map(
    (await db.select({ id: vehicles.id, name: vehicles.name }).from(vehicles))
      .map((v) => [v.id, v.name])
  );

  const subscribers = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.preferCritical, true));

  for (const event of pendingCritical) {
    const vName = vehicleNames.get(event.vehicleId) ?? "Unknown";
    const payload: PushPayload = {
      title: `⚠️ Critical Alert: ${event.type.replace("_", " ")}`,
      body: `${vName} — value: ${event.value}`,
      tag: `alert-${event.type}-${event.vehicleId}`,
      url: "/owner",
    };

    for (const sub of subscribers) {
      await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );
    }

    await db.update(alertEvents)
      .set({ pushedAt: new Date() })
      .where(eq(alertEvents.id, event.id));
  }
}

export async function sendDailyDigest() {
  const today = new Date().toISOString().slice(0, 10);

  const openEvents = await db
    .select({ type: alertEvents.type, severity: alertEvents.severity })
    .from(alertEvents)
    .where(isNull(alertEvents.resolvedAt));

  if (openEvents.length === 0) return;

  const criticalCount = openEvents.filter((e) => e.severity === "critical").length;
  const warningCount = openEvents.filter((e) => e.severity === "warning").length;

  const subscribers = await db
    .select()
    .from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.preferDailyDigest, true),
      sql`(${pushSubscriptions.lastDigestSentDate} IS NULL OR ${pushSubscriptions.lastDigestSentDate} < ${today})`
    ));

  const payload: PushPayload = {
    title: "📊 Daily Alert Digest",
    body: `${criticalCount} critical, ${warningCount} warning alerts open`,
    tag: "daily-digest",
    url: "/owner",
  };

  for (const sub of subscribers) {
    await sendPushNotification(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload
    );
    await db.update(pushSubscriptions)
      .set({ lastDigestSentDate: today })
      .where(eq(pushSubscriptions.id, sub.id));
  }
}

export async function getOpenAlertEvents() {
  const openEvents = await db
    .select({
      id: alertEvents.id,
      type: alertEvents.type,
      severity: alertEvents.severity,
      vehicleId: alertEvents.vehicleId,
      vehicleName: vehicles.name,
      value: alertEvents.value,
      detectedDate: alertEvents.detectedDate,
    })
    .from(alertEvents)
    .innerJoin(vehicles, eq(alertEvents.vehicleId, vehicles.id))
    .where(isNull(alertEvents.resolvedAt))
    .orderBy(alertEvents.severity, alertEvents.detectedAt);

  return openEvents.map((e) => ({
    type: e.type as "idling" | "fuel_anomaly" | "maintenance_overdue",
    severity: e.severity as "warning" | "critical",
    vehicleName: e.vehicleName,
    value: Number(e.value ?? 0),
  }));
}
