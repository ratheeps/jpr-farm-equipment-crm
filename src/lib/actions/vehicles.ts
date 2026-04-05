"use server";

import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { requireSession, isRole } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { validateVehicle } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

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

  const validated = validateVehicle(data);

  await db.insert(vehicles).values({
    name: validated.name,
    registrationNumber: validated.registrationNumber ?? null,
    vehicleType: validated.vehicleType as never,
    billingModel: validated.billingModel as never,
    ratePerHour: validated.ratePerHour ?? null,
    ratePerAcre: validated.ratePerAcre ?? null,
    ratePerKm: validated.ratePerKm ?? null,
    ratePerTask: validated.ratePerTask ?? null,
    fuelConsumptionBaseline: validated.fuelConsumptionBaseline ?? null,
    maintenanceIntervalHours: validated.maintenanceIntervalHours ?? 250,
    currentEngineHours: validated.currentEngineHours ?? "0",
    status: validated.status as never,
    notes: validated.notes ?? null,
  });

  await logAudit("create", "vehicles", validated.name, session.userId, undefined, validated as Record<string, unknown>);

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

  await logAudit("update", "vehicles", id, session.userId, undefined, data as unknown as Record<string, unknown>);

  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${id}`);
}

export async function updateVehicleStatus(
  id: string,
  status: "active" | "inactive" | "maintenance"
) {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin")) {
    throw new Error("Forbidden");
  }
  await db
    .update(vehicles)
    .set({ status: status as never, updatedAt: new Date() })
    .where(eq(vehicles.id, id));
  await logAudit("update", "vehicles", id, session.userId, undefined, { status });
  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${id}`);
}

export async function deleteVehicle(id: string) {
  const session = await requireSession();
  if (!isRole(session, "super_admin")) {
    throw new Error("Forbidden");
  }

  await db.update(vehicles).set({ status: "inactive" }).where(eq(vehicles.id, id));
  await logAudit("deactivate", "vehicles", id, session.userId);
  revalidatePath("/admin/vehicles");
}

export async function getVehicles() {
  const session = await requireSession();
  if (!isRole(session, "super_admin", "admin", "auditor")) {
    throw new Error("Forbidden");
  }
  return db.select().from(vehicles).orderBy(vehicles.name);
}
