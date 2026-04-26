"use server";

import { db } from "@/db";
import {
  dailyLogs,
  vehicles,
  maintenanceSchedules,
  maintenanceRecords,
  expenses,
  staffProfiles,
  projects,
  invoices,
  paddyFarms,
  farmCycles,
  farmInputs,
  farmHarvests,
  users,
  companySettings,
} from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, isNotNull, sql, not, and, desc, gte, lte } from "drizzle-orm";
import { resolveThreshold } from "@/lib/alerts/thresholds";

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

// ─── Idling Report ────────────────────────────────────────────────────────────

export type IdlingRow = {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  totalEngineHours: number;
  nonProductiveEngineHours: number;
  idleRatioPct: number;
  baselineLPerHr: number | null;
  estimatedIdleFuelLiters: number | null;
};

export async function getIdlingReport(): Promise<IdlingRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const rows = await db
    .select({
      vehicleId: vehicles.id,
      vehicleName: vehicles.name,
      vehicleType: vehicles.vehicleType,
      baselineLPerHr: vehicles.fuelConsumptionBaseline,
      totalEngineHours: sql<string>`COALESCE(SUM(CASE WHEN ${dailyLogs.endEngineHours} IS NOT NULL THEN (${dailyLogs.endEngineHours} - ${dailyLogs.startEngineHours}) ELSE 0 END), 0)`,
      productiveEngineHours: sql<string>`COALESCE(SUM(CASE WHEN ${dailyLogs.endEngineHours} IS NOT NULL AND (${dailyLogs.acresWorked} > 0 OR ${dailyLogs.kmTraveled} > 0) THEN (${dailyLogs.endEngineHours} - ${dailyLogs.startEngineHours}) ELSE 0 END), 0)`,
    })
    .from(vehicles)
    .leftJoin(dailyLogs, eq(dailyLogs.vehicleId, vehicles.id))
    .groupBy(
      vehicles.id,
      vehicles.name,
      vehicles.vehicleType,
      vehicles.fuelConsumptionBaseline
    )
    .orderBy(vehicles.name);

  return rows
    .map((r) => {
      const total = Number(r.totalEngineHours);
      const productive = Number(r.productiveEngineHours);
      const idle = Math.max(0, total - productive);
      const idleRatioPct = total > 0 ? Math.round((idle / total) * 1000) / 10 : 0;
      const baseline = r.baselineLPerHr ? Number(r.baselineLPerHr) : null;
      return {
        vehicleId: r.vehicleId,
        vehicleName: r.vehicleName,
        vehicleType: r.vehicleType,
        totalEngineHours: Math.round(total * 10) / 10,
        nonProductiveEngineHours: Math.round(idle * 10) / 10,
        idleRatioPct,
        baselineLPerHr: baseline,
        estimatedIdleFuelLiters:
          baseline !== null ? Math.round(idle * baseline * 10) / 10 : null,
      };
    })
    .filter((r) => r.totalEngineHours > 0);
}

// ─── Fuel Discrepancy Report ──────────────────────────────────────────────────

export type FuelDiscrepancyRow = {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  baselineLPerHr: number | null;
  totalEngineHours: number;
  expectedFuelLiters: number | null;
  actualFuelLogged: number;
  discrepancyLiters: number | null;
  discrepancyPct: number | null;
  flagged: boolean;
};

export async function getFuelDiscrepancyReport(): Promise<FuelDiscrepancyRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const rows = await db
    .select({
      vehicleId: vehicles.id,
      vehicleName: vehicles.name,
      vehicleType: vehicles.vehicleType,
      baselineLPerHr: vehicles.fuelConsumptionBaseline,
      totalEngineHours: sql<string>`COALESCE(SUM(CASE WHEN ${dailyLogs.endEngineHours} IS NOT NULL THEN (${dailyLogs.endEngineHours} - ${dailyLogs.startEngineHours}) ELSE 0 END), 0)`,
      actualFuelLogged: sql<string>`COALESCE(SUM(${dailyLogs.fuelUsedLiters}), 0)`,
    })
    .from(vehicles)
    .leftJoin(dailyLogs, and(eq(dailyLogs.vehicleId, vehicles.id), isNotNull(dailyLogs.endEngineHours)))
    .groupBy(
      vehicles.id,
      vehicles.name,
      vehicles.vehicleType,
      vehicles.fuelConsumptionBaseline
    )
    .orderBy(vehicles.name);

  return rows
    .map((r) => {
      const hours = Number(r.totalEngineHours);
      const actualFuel = Number(r.actualFuelLogged);
      const baseline = r.baselineLPerHr ? Number(r.baselineLPerHr) : null;
      const expectedFuel =
        baseline !== null && hours > 0
          ? Math.round(hours * baseline * 10) / 10
          : null;
      const discrepancyLiters =
        expectedFuel !== null
          ? Math.round((actualFuel - expectedFuel) * 10) / 10
          : null;
      const discrepancyPct =
        expectedFuel !== null && expectedFuel > 0
          ? Math.round(((actualFuel - expectedFuel) / expectedFuel) * 1000) / 10
          : null;
      return {
        vehicleId: r.vehicleId,
        vehicleName: r.vehicleName,
        vehicleType: r.vehicleType,
        baselineLPerHr: baseline,
        totalEngineHours: Math.round(hours * 10) / 10,
        expectedFuelLiters: expectedFuel,
        actualFuelLogged: Math.round(actualFuel * 10) / 10,
        discrepancyLiters,
        discrepancyPct,
        flagged: discrepancyPct !== null && Math.abs(discrepancyPct) > 20,
      };
    })
    .filter((r) => r.totalEngineHours > 0);
}

// ─── Project Margin Report ────────────────────────────────────────────────────

export type ProjectMarginRow = {
  projectId: string;
  projectName: string;
  clientName: string;
  status: string;
  revenue: number;
  fuelCost: number;
  partsCost: number;
  laborCost: number;
  otherCost: number;
  totalCost: number;
  margin: number;
  marginPct: number | null;
};

export async function getProjectMarginReport(): Promise<ProjectMarginRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  const [allProjects, invoiceRevenue, projectExpenses] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name, clientName: projects.clientName, status: projects.status })
      .from(projects)
      .where(not(eq(projects.status, "planned")))
      .orderBy(projects.createdAt),

    db
      .select({
        projectId: invoices.projectId,
        total: sql<string>`SUM(${invoices.total})`,
      })
      .from(invoices)
      .where(and(isNotNull(invoices.projectId), not(eq(invoices.status, "cancelled"))))
      .groupBy(invoices.projectId),

    db
      .select({
        projectId: expenses.projectId,
        category: expenses.category,
        total: sql<string>`SUM(${expenses.amount})`,
      })
      .from(expenses)
      .where(isNotNull(expenses.projectId))
      .groupBy(expenses.projectId, expenses.category),
  ]);

  return allProjects.map((p) => {
    const revenue = Number(invoiceRevenue.find((r) => r.projectId === p.id)?.total ?? 0);
    const expRows = projectExpenses.filter((e) => e.projectId === p.id);
    const fuelCost = expRows.filter((e) => e.category === "fuel").reduce((s, e) => s + Number(e.total), 0);
    const partsCost = expRows.filter((e) => e.category === "parts" || e.category === "repair").reduce((s, e) => s + Number(e.total), 0);
    const laborCost = expRows.filter((e) => e.category === "labor").reduce((s, e) => s + Number(e.total), 0);
    const otherCost = expRows.filter((e) => !["fuel", "parts", "repair", "labor"].includes(e.category)).reduce((s, e) => s + Number(e.total), 0);
    const totalCost = fuelCost + partsCost + laborCost + otherCost;
    const margin = revenue - totalCost;
    const marginPct = revenue > 0 ? Math.round((margin / revenue) * 1000) / 10 : null;
    return {
      projectId: p.id,
      projectName: p.name,
      clientName: p.clientName,
      status: p.status,
      revenue: Math.round(revenue * 100) / 100,
      fuelCost: Math.round(fuelCost * 100) / 100,
      partsCost: Math.round(partsCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      otherCost: Math.round(otherCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      marginPct,
    };
  });
}

// ─── Fleet Positions (for Owner Dashboard map) ───────────────────────────────

export type FleetPositionRow = {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  vehicleStatus: string;
  lat: number;
  lng: number;
  lastLogDate: string;
  operatorName: string;
};

export async function getFleetPositions(): Promise<FleetPositionRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  // Fetch all logs that have GPS data, ordered newest first
  const logs = await db
    .select({
      vehicleId: dailyLogs.vehicleId,
      vehicleName: vehicles.name,
      vehicleType: vehicles.vehicleType,
      vehicleStatus: vehicles.status,
      lat: dailyLogs.gpsLatEnd,
      lng: dailyLogs.gpsLngEnd,
      latStart: dailyLogs.gpsLatStart,
      lngStart: dailyLogs.gpsLngStart,
      date: dailyLogs.date,
      operatorName: staffProfiles.fullName,
    })
    .from(dailyLogs)
    .innerJoin(vehicles, eq(dailyLogs.vehicleId, vehicles.id))
    .innerJoin(staffProfiles, eq(dailyLogs.operatorId, staffProfiles.id))
    .orderBy(sql`${dailyLogs.date} DESC, ${dailyLogs.createdAt} DESC`);

  // Keep only the latest log per vehicle that has a GPS coordinate
  const seen = new Set<string>();
  const result: FleetPositionRow[] = [];
  for (const log of logs) {
    if (seen.has(log.vehicleId)) continue;
    const lat = log.lat ?? log.latStart;
    const lng = log.lng ?? log.lngStart;
    if (lat && lng) {
      seen.add(log.vehicleId);
      result.push({
        vehicleId: log.vehicleId,
        vehicleName: log.vehicleName,
        vehicleType: log.vehicleType,
        vehicleStatus: log.vehicleStatus,
        lat: Number(lat),
        lng: Number(lng),
        lastLogDate: log.date,
        operatorName: log.operatorName ?? "",
      });
    }
  }
  return result;
}

// ─── Asset Profitability (for Owner Dashboard chart) ─────────────────────────

export type AssetProfitabilityRow = {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  totalCosts: number;
  totalEngineHours: number;
  costPerHour: number | null;
};

export async function getAssetProfitability(): Promise<AssetProfitabilityRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const [vehicleList, expenseByVehicle, hoursByVehicle] = await Promise.all([
    db.select({ id: vehicles.id, name: vehicles.name, type: vehicles.vehicleType }).from(vehicles).orderBy(vehicles.name),
    db
      .select({
        vehicleId: expenses.vehicleId,
        total: sql<string>`SUM(${expenses.amount})`,
      })
      .from(expenses)
      .where(isNotNull(expenses.vehicleId))
      .groupBy(expenses.vehicleId),
    db
      .select({
        vehicleId: dailyLogs.vehicleId,
        hours: sql<string>`COALESCE(SUM(CASE WHEN ${dailyLogs.endEngineHours} IS NOT NULL THEN (${dailyLogs.endEngineHours} - ${dailyLogs.startEngineHours}) ELSE 0 END), 0)`,
      })
      .from(dailyLogs)
      .groupBy(dailyLogs.vehicleId),
  ]);

  return vehicleList.map((v) => {
    const totalCosts = Number(expenseByVehicle.find((e) => e.vehicleId === v.id)?.total ?? 0);
    const totalEngineHours = Number(hoursByVehicle.find((h) => h.vehicleId === v.id)?.hours ?? 0);
    const costPerHour = totalEngineHours > 0 ? Math.round((totalCosts / totalEngineHours) * 100) / 100 : null;
    return {
      vehicleId: v.id,
      vehicleName: v.name,
      vehicleType: v.type,
      totalCosts: Math.round(totalCosts * 100) / 100,
      totalEngineHours: Math.round(totalEngineHours * 10) / 10,
      costPerHour,
    };
  }).filter((v) => v.totalCosts > 0 || v.totalEngineHours > 0);
}

// ─── All Farm ROI (for Owner Dashboard chart) ─────────────────────────────────

export type FarmROIRow = {
  farmId: string;
  farmName: string;
  areaAcres: number;
  totalInputCost: number;
  totalRevenue: number;
  profit: number;
  roiPct: number | null;
};

export async function getAllFarmROI(): Promise<FarmROIRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const farms = await db
    .select({ id: paddyFarms.id, name: paddyFarms.name, areaAcres: paddyFarms.areaAcres })
    .from(paddyFarms)
    .where(eq(paddyFarms.isActive, true))
    .orderBy(paddyFarms.name);

  const cycles = await db
    .select({ id: farmCycles.id, farmId: farmCycles.farmId })
    .from(farmCycles);

  const inputs = await db
    .select({
      cycleId: farmInputs.cycleId,
      totalCost: sql<string>`SUM(${farmInputs.totalCost})`,
    })
    .from(farmInputs)
    .groupBy(farmInputs.cycleId);

  const harvests = await db
    .select({
      cycleId: farmHarvests.cycleId,
      totalRevenue: sql<string>`SUM(${farmHarvests.revenue})`,
    })
    .from(farmHarvests)
    .groupBy(farmHarvests.cycleId);

  return farms.map((farm) => {
    const farmCycleIds = cycles.filter((c) => c.farmId === farm.id).map((c) => c.id);
    const totalInputCost = inputs
      .filter((i) => farmCycleIds.includes(i.cycleId))
      .reduce((s, i) => s + Number(i.totalCost), 0);
    const totalRevenue = harvests
      .filter((h) => farmCycleIds.includes(h.cycleId))
      .reduce((s, h) => s + Number(h.totalRevenue), 0);
    const profit = totalRevenue - totalInputCost;
    const roiPct =
      totalInputCost > 0 ? Math.round((profit / totalInputCost) * 1000) / 10 : null;
    return {
      farmId: farm.id,
      farmName: farm.name,
      areaAcres: Number(farm.areaAcres),
      totalInputCost: Math.round(totalInputCost * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      roiPct,
    };
  });
}

// ─── Expense Alerts (for Owner Dashboard) ─────────────────────────────────────

export type ExpenseAlert =
  | {
      type: "idling";
      severity: "warning" | "critical";
      vehicleName: string;
      value: number;
      idleRatio: number;
      hours: number;
    }
  | {
      type: "fuel_anomaly";
      severity: "warning" | "critical";
      vehicleName: string;
      value: number;
      pct: number;
      liters: number;
      over: boolean;
    }
  | {
      type: "maintenance_overdue";
      severity: "warning" | "critical";
      vehicleName: string;
      value: number;
      count: number;
      types: string;
    };

export async function getExpenseAlerts(): Promise<ExpenseAlert[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const [idlingRows, fuelRows, maintenanceRows, settingsResult, vehicleThresholds] = await Promise.all([
    getIdlingReport(),
    getFuelDiscrepancyReport(),
    getMaintenanceStatusReport(),
    db.select().from(companySettings).limit(1),
    db.select({
      id: vehicles.id,
      idleCriticalPct: vehicles.idleCriticalPct,
      idleWarnPct: vehicles.idleWarnPct,
      fuelVariancePct: vehicles.fuelVariancePct,
    }).from(vehicles),
  ]);

  const defaults = settingsResult[0] || null;
  const vehicleMap = new Map(vehicleThresholds.map(v => [v.id, v]));

  const alerts: ExpenseAlert[] = [];

  for (const row of idlingRows) {
    const vehicle = vehicleMap.get(row.vehicleId);
    if (!vehicle) continue;
    const criticalThreshold = resolveThreshold(vehicle, defaults, "idleCriticalPct");
    const warnThreshold = resolveThreshold(vehicle, defaults, "idleWarnPct");

    if (row.idleRatioPct >= criticalThreshold) {
      alerts.push({
        type: "idling",
        severity: "critical",
        vehicleName: row.vehicleName,
        value: row.idleRatioPct,
        idleRatio: row.idleRatioPct,
        hours: row.nonProductiveEngineHours,
      });
    } else if (row.idleRatioPct >= warnThreshold) {
      alerts.push({
        type: "idling",
        severity: "warning",
        vehicleName: row.vehicleName,
        value: row.idleRatioPct,
        idleRatio: row.idleRatioPct,
        hours: row.nonProductiveEngineHours,
      });
    }
  }

  for (const row of fuelRows) {
    if (!row.flagged) continue;
    const vehicle = vehicleMap.get(row.vehicleId);
    if (!vehicle) continue;
    const fuelThreshold = resolveThreshold(vehicle, defaults, "fuelVariancePct");
    const pct = row.discrepancyPct ?? 0;
    const positive = pct > 0;
    alerts.push({
      type: "fuel_anomaly",
      severity: Math.abs(pct) >= fuelThreshold ? "critical" : "warning",
      vehicleName: row.vehicleName,
      value: pct,
      pct: Math.abs(pct),
      liters: Math.abs(row.discrepancyLiters ?? 0),
      over: positive,
    });
  }

  for (const row of maintenanceRows) {
    alerts.push({
      type: "maintenance_overdue",
      severity: "critical",
      vehicleName: row.vehicleName,
      value: row.overdueCount,
      count: row.overdueCount,
      types: row.overdueTypes.join(", "),
    });
  }

  return alerts.sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (a.severity !== "critical" && b.severity === "critical") return 1;
    return 0;
  });
}

// ─── Staff Performance Report ─────────────────────────────────────────────────

export type StaffPerformanceRow = {
  staffProfileId: string;
  staffName: string;
  phone: string | null;
  totalLogs: number;
  totalHours: number;
  totalFuelLiters: number;
  totalAcres: number;
  totalKm: number;
  idleRatioPct: number | null;
};

export async function getStaffPerformance(
  dateFrom?: string,
  dateTo?: string
): Promise<StaffPerformanceRow[]> {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) throw new Error("Forbidden");

  const conditions = [eq(users.role, "operator"), eq(users.isActive, true)];

  const rows = await db
    .select({
      staffProfileId: staffProfiles.id,
      staffName: staffProfiles.fullName,
      phone: staffProfiles.phone,
      totalLogs: sql<string>`COUNT(${dailyLogs.id})`,
      totalHours: sql<string>`COALESCE(SUM(${dailyLogs.endEngineHours} - ${dailyLogs.startEngineHours}), 0)`,
      totalFuelLiters: sql<string>`COALESCE(SUM(${dailyLogs.fuelUsedLiters}), 0)`,
      totalAcres: sql<string>`COALESCE(SUM(${dailyLogs.acresWorked}), 0)`,
      totalKm: sql<string>`COALESCE(SUM(${dailyLogs.kmTraveled}), 0)`,
      productiveHours: sql<string>`COALESCE(SUM(
        CASE WHEN ${dailyLogs.acresWorked} > 0 OR ${dailyLogs.kmTraveled} > 0
          THEN ${dailyLogs.endEngineHours} - ${dailyLogs.startEngineHours}
          ELSE 0 END
      ), 0)`,
    })
    .from(staffProfiles)
    .innerJoin(users, eq(staffProfiles.userId, users.id))
    .leftJoin(
      dailyLogs,
      and(
        eq(dailyLogs.operatorId, staffProfiles.id),
        isNotNull(dailyLogs.endEngineHours),
        dateFrom ? gte(dailyLogs.date, dateFrom) : undefined,
        dateTo ? lte(dailyLogs.date, dateTo) : undefined
      )
    )
    .where(and(...conditions))
    .groupBy(staffProfiles.id, staffProfiles.fullName, staffProfiles.phone)
    .orderBy(staffProfiles.fullName);

  return rows.map((r) => {
    const totalH = Number(r.totalHours);
    const prodH = Number(r.productiveHours);
    const idleRatio =
      totalH > 0 ? Math.round(((totalH - prodH) / totalH) * 100) : null;
    return {
      staffProfileId: r.staffProfileId,
      staffName: r.staffName,
      phone: r.phone,
      totalLogs: Number(r.totalLogs),
      totalHours: totalH,
      totalFuelLiters: Number(r.totalFuelLiters),
      totalAcres: Number(r.totalAcres),
      totalKm: Number(r.totalKm),
      idleRatioPct: idleRatio,
    };
  });
}

export async function getTopPerformers(
  dateFrom?: string,
  dateTo?: string,
  limit = 5
): Promise<StaffPerformanceRow[]> {
  const all = await getStaffPerformance(dateFrom, dateTo);
  return all
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, limit);
}
