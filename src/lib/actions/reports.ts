"use server";

import { db } from "@/db";
import {
  dailyLogs,
  vehicles,
  maintenanceSchedules,
  maintenanceRecords,
  expenses,
  staffProfiles,
} from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, isNotNull, sql } from "drizzle-orm";

// ─── Fuel Efficiency Report ──────────────────────────────────────────────────

export type FuelEfficiencyRow = {
  vehicleId: string;
  vehicleName: string;
  baselineLPerHr: number | null;
  totalFuelLiters: number;
  totalEngineHours: number;
  actualLPerHr: number | null;
  variancePct: number | null;
};

export async function getFuelEfficiencyReport(): Promise<FuelEfficiencyRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const rows = await db
    .select({
      vehicleId: vehicles.id,
      vehicleName: vehicles.name,
      baselineLPerHr: vehicles.fuelConsumptionBaseline,
      totalFuelLiters: sql<string>`COALESCE(SUM(${dailyLogs.fuelUsedLiters}), 0)`,
      totalEngineHours: sql<string>`COALESCE(SUM(${dailyLogs.endEngineHours} - ${dailyLogs.startEngineHours}), 0)`,
    })
    .from(vehicles)
    .leftJoin(
      dailyLogs,
      eq(dailyLogs.vehicleId, vehicles.id)
    )
    .groupBy(vehicles.id, vehicles.name, vehicles.fuelConsumptionBaseline)
    .orderBy(vehicles.name);

  return rows.map((r) => {
    const fuel = Number(r.totalFuelLiters);
    const hours = Number(r.totalEngineHours);
    const baseline = r.baselineLPerHr ? Number(r.baselineLPerHr) : null;
    const actual = hours > 0 ? fuel / hours : null;
    const variance =
      actual !== null && baseline !== null && baseline > 0
        ? ((actual - baseline) / baseline) * 100
        : null;

    return {
      vehicleId: r.vehicleId,
      vehicleName: r.vehicleName,
      baselineLPerHr: baseline,
      totalFuelLiters: fuel,
      totalEngineHours: hours,
      actualLPerHr: actual !== null ? Math.round(actual * 100) / 100 : null,
      variancePct: variance !== null ? Math.round(variance * 10) / 10 : null,
    };
  }).filter((r) => r.totalEngineHours > 0 || r.totalFuelLiters > 0);
}

// ─── Engine Hours Summary ────────────────────────────────────────────────────

export type EngineHoursRow = {
  vehicleId: string;
  vehicleName: string;
  totalHours: number;
};

export async function getEngineHoursSummary(): Promise<EngineHoursRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const rows = await db
    .select({
      vehicleId: vehicles.id,
      vehicleName: vehicles.name,
      totalHours: sql<string>`COALESCE(SUM(${dailyLogs.endEngineHours} - ${dailyLogs.startEngineHours}), 0)`,
    })
    .from(vehicles)
    .leftJoin(dailyLogs, eq(dailyLogs.vehicleId, vehicles.id))
    .where(isNotNull(dailyLogs.endEngineHours))
    .groupBy(vehicles.id, vehicles.name)
    .orderBy(sql`SUM(${dailyLogs.endEngineHours} - ${dailyLogs.startEngineHours}) DESC NULLS LAST`);

  return rows
    .map((r) => ({
      vehicleId: r.vehicleId,
      vehicleName: r.vehicleName,
      totalHours: Math.round(Number(r.totalHours) * 10) / 10,
    }))
    .filter((r) => r.totalHours > 0);
}

// ─── Maintenance Status Report ───────────────────────────────────────────────

export type MaintenanceStatusRow = {
  vehicleId: string;
  vehicleName: string;
  currentEngineHours: number;
  overdueCount: number;
  overdueTypes: string[];
};

export async function getMaintenanceStatusReport(): Promise<MaintenanceStatusRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const allVehicles = await db
    .select({ id: vehicles.id, name: vehicles.name, hrs: vehicles.currentEngineHours })
    .from(vehicles)
    .orderBy(vehicles.name);

  const overdueSchedules = await db
    .select({
      vehicleId: maintenanceSchedules.vehicleId,
      type: maintenanceSchedules.type,
    })
    .from(maintenanceSchedules)
    .where(eq(maintenanceSchedules.isOverdue, true));

  const result: MaintenanceStatusRow[] = [];

  for (const v of allVehicles) {
    const types = overdueSchedules
      .filter((s) => s.vehicleId === v.id)
      .map((s) => s.type);
    if (types.length > 0) {
      result.push({
        vehicleId: v.id,
        vehicleName: v.name,
        currentEngineHours: Number(v.hrs),
        overdueCount: types.length,
        overdueTypes: types,
      });
    }
  }

  return result;
}

// ─── Export Data ─────────────────────────────────────────────────────────────

export type LogExportRow = {
  date: string;
  vehicleName: string;
  operatorName: string;
  startHrs: number;
  endHrs: number | null;
  fuelLiters: number | null;
  kmTraveled: number | null;
  acresWorked: number | null;
};

export async function exportLogsData(): Promise<LogExportRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const rows = await db
    .select({
      date: dailyLogs.date,
      vehicleName: vehicles.name,
      operatorName: staffProfiles.fullName,
      startHrs: dailyLogs.startEngineHours,
      endHrs: dailyLogs.endEngineHours,
      fuelLiters: dailyLogs.fuelUsedLiters,
      kmTraveled: dailyLogs.kmTraveled,
      acresWorked: dailyLogs.acresWorked,
    })
    .from(dailyLogs)
    .leftJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
    .leftJoin(staffProfiles, eq(dailyLogs.operatorId, staffProfiles.id))
    .orderBy(dailyLogs.date);

  return rows.map((r) => ({
    date: r.date,
    vehicleName: r.vehicleName ?? "",
    operatorName: r.operatorName ?? "",
    startHrs: Number(r.startHrs),
    endHrs: r.endHrs !== null ? Number(r.endHrs) : null,
    fuelLiters: r.fuelLiters !== null ? Number(r.fuelLiters) : null,
    kmTraveled: r.kmTraveled !== null ? Number(r.kmTraveled) : null,
    acresWorked: r.acresWorked !== null ? Number(r.acresWorked) : null,
  }));
}

export type ExpenseExportRow = {
  date: string;
  vehicleName: string;
  category: string;
  amount: number;
  description: string;
};

export async function exportExpensesData(): Promise<ExpenseExportRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const rows = await db
    .select({
      date: expenses.date,
      vehicleName: vehicles.name,
      category: expenses.category,
      amount: expenses.amount,
      description: expenses.description,
    })
    .from(expenses)
    .leftJoin(vehicles, eq(expenses.vehicleId, vehicles.id))
    .orderBy(expenses.date);

  return rows.map((r) => ({
    date: r.date,
    vehicleName: r.vehicleName ?? "",
    category: r.category,
    amount: Number(r.amount),
    description: r.description ?? "",
  }));
}

export type MaintenanceExportRow = {
  serviceDate: string;
  vehicleName: string;
  type: string;
  engineHoursAtService: number | null;
  cost: number | null;
  performedBy: string;
};

export async function exportMaintenanceData(): Promise<MaintenanceExportRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const rows = await db
    .select({
      serviceDate: maintenanceRecords.serviceDate,
      vehicleName: vehicles.name,
      type: maintenanceRecords.type,
      engineHoursAtService: maintenanceRecords.engineHoursAtService,
      cost: maintenanceRecords.cost,
      performedBy: maintenanceRecords.performedBy,
    })
    .from(maintenanceRecords)
    .leftJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id))
    .orderBy(maintenanceRecords.serviceDate);

  return rows.map((r) => ({
    serviceDate: r.serviceDate,
    vehicleName: r.vehicleName ?? "",
    type: r.type,
    engineHoursAtService:
      r.engineHoursAtService !== null ? Number(r.engineHoursAtService) : null,
    cost: r.cost !== null ? Number(r.cost) : null,
    performedBy: r.performedBy ?? "",
  }));
}
