"use server";

import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type VehicleFormData = {
  name: string;
  registrationNumber?: string;
  vehicleType: string;
  billingModel: string;
  ratePerHour?: string;
  ratePerAcre?: string;
  ratePerKm?: string;
  ratePerTask?: string;
  fuelConsumptionBaseline?: string;
  maintenanceIntervalHours?: number;
  currentEngineHours?: string;
  status: string;
  notes?: string;
};

export async function createVehicle(data: VehicleFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db.insert(vehicles).values({
    name: data.name,
    registrationNumber: data.registrationNumber || null,
    vehicleType: data.vehicleType as never,
    billingModel: data.billingModel as never,
    ratePerHour: data.ratePerHour || null,
    ratePerAcre: data.ratePerAcre || null,
    ratePerKm: data.ratePerKm || null,
    ratePerTask: data.ratePerTask || null,
    fuelConsumptionBaseline: data.fuelConsumptionBaseline || null,
    maintenanceIntervalHours: data.maintenanceIntervalHours ?? 250,
    currentEngineHours: data.currentEngineHours || "0",
    status: data.status as never,
    notes: data.notes || null,
  });

  revalidatePath("/admin/vehicles");
  revalidatePath("/owner");
}

export async function updateVehicle(id: string, data: VehicleFormData) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }

  await db
    .update(vehicles)
    .set({
      name: data.name,
      registrationNumber: data.registrationNumber || null,
      vehicleType: data.vehicleType as never,
      billingModel: data.billingModel as never,
      ratePerHour: data.ratePerHour || null,
      ratePerAcre: data.ratePerAcre || null,
      ratePerKm: data.ratePerKm || null,
      ratePerTask: data.ratePerTask || null,
      fuelConsumptionBaseline: data.fuelConsumptionBaseline || null,
      maintenanceIntervalHours: data.maintenanceIntervalHours ?? 250,
      currentEngineHours: data.currentEngineHours || "0",
      status: data.status as never,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(vehicles.id, id));

  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${id}`);
}

export async function deleteVehicle(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin")) {
    throw new Error("Forbidden");
  }

  await db.update(vehicles).set({ status: "inactive" }).where(eq(vehicles.id, id));
  revalidatePath("/admin/vehicles");
}

export async function getVehicles() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }
  return db.select().from(vehicles).orderBy(vehicles.name);
}
