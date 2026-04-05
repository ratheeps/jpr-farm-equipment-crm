import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { MaintenanceSchedules } from "@/components/vehicles/maintenance-schedules";
import { MaintenanceHistory } from "@/components/vehicles/maintenance-history";
import { VehicleAssignments } from "@/components/vehicles/vehicle-assignments";
import { getMaintenanceRecords, getMaintenanceSchedules } from "@/lib/actions/maintenance";
import {
  getVehicleAssignments,
  getAvailableOperators,
} from "@/lib/actions/vehicle-assignments";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const t = await getTranslations("vehicles");

  const [vehicleResult, records, schedules, assignments, operators] =
    await Promise.all([
      db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1),
      getMaintenanceRecords(id),
      getMaintenanceSchedules(id),
      getVehicleAssignments(id),
      getAvailableOperators(),
    ]);

  if (!vehicleResult[0]) redirect(`/${locale}/admin/more`);
  const vehicle = vehicleResult[0];

  const canDelete = session.role === "super_admin";

  return (
    <div>
      <Topbar title={vehicle.name} showBack />
      <div className="px-4 py-4">
        <VehicleForm
          locale={locale}
          initial={{
            id: vehicle.id,
            name: vehicle.name,
            registrationNumber: vehicle.registrationNumber,
            vehicleType: vehicle.vehicleType as never,
            billingModel: vehicle.billingModel as never,
            ratePerHour: vehicle.ratePerHour,
            ratePerAcre: vehicle.ratePerAcre,
            ratePerKm: vehicle.ratePerKm,
            ratePerTask: vehicle.ratePerTask,
            fuelConsumptionBaseline: vehicle.fuelConsumptionBaseline,
            maintenanceIntervalHours: vehicle.maintenanceIntervalHours,
            currentEngineHours: vehicle.currentEngineHours,
            status: vehicle.status,
            notes: vehicle.notes,
          }}
        />

        <div className="border-t border-border pt-4">
          <VehicleAssignments
            vehicleId={vehicle.id}
            assignments={assignments}
            availableOperators={operators}
          />
        </div>

        <div className="border-t border-border pt-4">
          <MaintenanceSchedules
            vehicleId={vehicle.id}
            schedules={schedules}
            currentEngineHours={Number(vehicle.currentEngineHours)}
            canDelete={canDelete}
          />
        </div>

        <div className="border-t border-border pt-4">
          <MaintenanceHistory
            vehicleId={vehicle.id}
            records={records}
            canDelete={canDelete}
          />
        </div>
      </div>
    </div>
  );
}
