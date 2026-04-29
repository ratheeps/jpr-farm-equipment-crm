"use server";

import { withRLS, type DB } from "@/db";
import {
  paddyFarms,
  farmCycles,
  farmInputs,
  farmHarvests,
} from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq, desc, count, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type FarmFormData = {
  name: string;
  areaAcres: string;
  locationText?: string;
  gpsLat?: string;
  gpsLng?: string;
  soilType?: string;
  waterSource?: string;
  isActive?: boolean;
};

export type CycleFormData = {
  seasonName: string;
  stage?: string;
  startDate?: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  notes?: string;
};

export type InputFormData = {
  inputType: string;
  productName?: string;
  quantity?: string;
  unit?: string;
  unitCost?: string;
  totalCost: string;
  appliedDate?: string;
  notes?: string;
};

export type HarvestFormData = {
  harvestDate: string;
  weightKg: string;
  grade?: string;
  pricePerKg?: string;
  revenue?: string;
  notes?: string;
};

// --------------- Farms ---------------

export async function getFarms() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx: DB) => {
    const rows = await tx
      .select({
        id: paddyFarms.id,
        name: paddyFarms.name,
        areaAcres: paddyFarms.areaAcres,
        locationText: paddyFarms.locationText,
        soilType: paddyFarms.soilType,
        waterSource: paddyFarms.waterSource,
        isActive: paddyFarms.isActive,
        createdAt: paddyFarms.createdAt,
        cycleCount: count(farmCycles.id),
      })
      .from(paddyFarms)
      .leftJoin(farmCycles, eq(farmCycles.farmId, paddyFarms.id))
      .groupBy(paddyFarms.id)
      .orderBy(desc(paddyFarms.createdAt));

    return rows;
  });
}

export async function getFarm(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx: DB) => {
    const farm = await tx.query.paddyFarms.findFirst({
      where: eq(paddyFarms.id, id),
      with: {
        cycles: {
          with: {
            inputs: true,
            harvests: true,
          },
          orderBy: [desc(farmCycles.createdAt)],
        },
      },
    });

    return farm ?? null;
  });
}

export async function createFarm(data: FarmFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await withRLS(session.userId, session.role, async (tx: DB) => {
    await tx.insert(paddyFarms).values({
      name: data.name,
      areaAcres: data.areaAcres,
      locationText: data.locationText || null,
      gpsLat: data.gpsLat || null,
      gpsLng: data.gpsLng || null,
      soilType: data.soilType || null,
      waterSource: data.waterSource || null,
    });
  });

  revalidatePath("/admin/farms");
  revalidatePath("/owner");
}

export async function updateFarm(id: string, data: FarmFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await withRLS(session.userId, session.role, async (tx: DB) => {
    await tx
      .update(paddyFarms)
      .set({
        name: data.name,
        areaAcres: data.areaAcres,
        locationText: data.locationText || null,
        gpsLat: data.gpsLat || null,
        gpsLng: data.gpsLng || null,
        soilType: data.soilType || null,
        waterSource: data.waterSource || null,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(paddyFarms.id, id));
  });

  revalidatePath("/admin/farms");
  revalidatePath(`/admin/farms/${id}`);
}

export async function deleteFarm(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin")) {
    throw new Error("Forbidden");
  }

  await withRLS(session.userId, session.role, async (tx: DB) => {
    await tx
      .update(paddyFarms)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(paddyFarms.id, id));
  });

  revalidatePath("/admin/farms");
}

// --------------- Cycles ---------------

export async function createCycle(farmId: string, data: CycleFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await withRLS(session.userId, session.role, async (tx: DB) => {
    await tx.insert(farmCycles).values({
      farmId,
      seasonName: data.seasonName,
      stage: (data.stage ?? "land_prep") as never,
      startDate: data.startDate || null,
      expectedEndDate: data.expectedEndDate || null,
      notes: data.notes || null,
    });
  });

  revalidatePath(`/admin/farms/${farmId}`);
}

export async function updateCycle(id: string, data: CycleFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const farmId = await withRLS(session.userId, session.role, async (tx: DB) => {
    const [cycle] = await tx
      .select({ farmId: farmCycles.farmId })
      .from(farmCycles)
      .where(eq(farmCycles.id, id));

    if (!cycle) throw new Error("Cycle not found");

    await tx
      .update(farmCycles)
      .set({
        seasonName: data.seasonName,
        stage: data.stage as never,
        startDate: data.startDate || null,
        expectedEndDate: data.expectedEndDate || null,
        actualEndDate: data.actualEndDate || null,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(farmCycles.id, id));

    return cycle.farmId;
  });

  revalidatePath(`/admin/farms/${farmId}`);
}

export async function deleteCycle(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const farmId = await withRLS(session.userId, session.role, async (tx: DB) => {
    const [cycle] = await tx
      .select({ farmId: farmCycles.farmId })
      .from(farmCycles)
      .where(eq(farmCycles.id, id));

    if (!cycle) throw new Error("Cycle not found");

    await tx.delete(farmCycles).where(eq(farmCycles.id, id));

    return cycle.farmId;
  });

  revalidatePath(`/admin/farms/${farmId}`);
}

// --------------- Inputs ---------------

export async function addInput(cycleId: string, data: InputFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  // Auto-calc totalCost if quantity and unitCost provided
  let totalCost = data.totalCost;
  if (data.quantity && data.unitCost && !totalCost) {
    totalCost = String(parseFloat(data.quantity) * parseFloat(data.unitCost));
  }

  const farmId = await withRLS(session.userId, session.role, async (tx: DB) => {
    await tx.insert(farmInputs).values({
      cycleId,
      inputType: data.inputType,
      productName: data.productName || null,
      quantity: data.quantity || null,
      unit: data.unit || null,
      unitCost: data.unitCost || null,
      totalCost,
      appliedDate: data.appliedDate || null,
      notes: data.notes || null,
    });

    const [cycle] = await tx
      .select({ farmId: farmCycles.farmId })
      .from(farmCycles)
      .where(eq(farmCycles.id, cycleId));

    return cycle?.farmId ?? null;
  });

  if (farmId) revalidatePath(`/admin/farms/${farmId}`);
}

export async function deleteInput(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const farmId = await withRLS(session.userId, session.role, async (tx: DB) => {
    const [input] = await tx
      .select({ cycleId: farmInputs.cycleId })
      .from(farmInputs)
      .where(eq(farmInputs.id, id));

    if (!input) throw new Error("Input not found");

    const [cycle] = await tx
      .select({ farmId: farmCycles.farmId })
      .from(farmCycles)
      .where(eq(farmCycles.id, input.cycleId));

    await tx.delete(farmInputs).where(eq(farmInputs.id, id));

    return cycle?.farmId ?? null;
  });

  if (farmId) revalidatePath(`/admin/farms/${farmId}`);
}

// --------------- Harvests ---------------

export async function addHarvest(cycleId: string, data: HarvestFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  // Auto-calc revenue if weightKg and pricePerKg provided
  let revenue = data.revenue || null;
  if (data.weightKg && data.pricePerKg && !revenue) {
    revenue = String(parseFloat(data.weightKg) * parseFloat(data.pricePerKg));
  }

  const farmId = await withRLS(session.userId, session.role, async (tx: DB) => {
    await tx.insert(farmHarvests).values({
      cycleId,
      harvestDate: data.harvestDate,
      weightKg: data.weightKg,
      grade: data.grade || null,
      pricePerKg: data.pricePerKg || null,
      revenue,
      notes: data.notes || null,
    });

    const [cycle] = await tx
      .select({ farmId: farmCycles.farmId })
      .from(farmCycles)
      .where(eq(farmCycles.id, cycleId));

    return cycle?.farmId ?? null;
  });

  if (farmId) revalidatePath(`/admin/farms/${farmId}`);
}

export async function deleteHarvest(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  const farmId = await withRLS(session.userId, session.role, async (tx: DB) => {
    const [harvest] = await tx
      .select({ cycleId: farmHarvests.cycleId })
      .from(farmHarvests)
      .where(eq(farmHarvests.id, id));

    if (!harvest) throw new Error("Harvest not found");

    const [cycle] = await tx
      .select({ farmId: farmCycles.farmId })
      .from(farmCycles)
      .where(eq(farmCycles.id, harvest.cycleId));

    await tx.delete(farmHarvests).where(eq(farmHarvests.id, id));

    return cycle?.farmId ?? null;
  });

  if (farmId) revalidatePath(`/admin/farms/${farmId}`);
}

// --------------- Summary ---------------

export async function getFarmSummary(farmId: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }

  return withRLS(session.userId, session.role, async (tx: DB) => {
    const [farm] = await tx
      .select({ areaAcres: paddyFarms.areaAcres })
      .from(paddyFarms)
      .where(eq(paddyFarms.id, farmId));

    if (!farm) return null;

    // Get all cycle IDs for this farm
    const cycles = await tx
      .select({ id: farmCycles.id })
      .from(farmCycles)
      .where(eq(farmCycles.farmId, farmId));

    const cycleIds = cycles.map((c) => c.id);

    let totalInputCost = 0;
    let totalRevenue = 0;

    if (cycleIds.length > 0) {
      // Sum inputs across all cycles
      for (const cid of cycleIds) {
        const [inputSum] = await tx
          .select({ total: sum(farmInputs.totalCost) })
          .from(farmInputs)
          .where(eq(farmInputs.cycleId, cid));
        totalInputCost += parseFloat(inputSum?.total ?? "0");

        const [harvestSum] = await tx
          .select({ total: sum(farmHarvests.revenue) })
          .from(farmHarvests)
          .where(eq(farmHarvests.cycleId, cid));
        totalRevenue += parseFloat(harvestSum?.total ?? "0");
      }
    }

    const areaAcres = parseFloat(farm.areaAcres);
    const profit = totalRevenue - totalInputCost;
    const roi = totalInputCost > 0 ? (profit / totalInputCost) * 100 : 0;
    const costPerAcre = areaAcres > 0 ? totalInputCost / areaAcres : 0;
    const revenuePerAcre = areaAcres > 0 ? totalRevenue / areaAcres : 0;

    return {
      totalInputCost,
      totalRevenue,
      profit,
      roi,
      costPerAcre,
      revenuePerAcre,
      areaAcres,
    };
  });
}
