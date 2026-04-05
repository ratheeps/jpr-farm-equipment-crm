import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Wrench } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getMaintenanceOverview } from "@/lib/actions/maintenance";

export default async function AdminMaintenancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const t = await getTranslations("maintenance");
  const tVehicles = await getTranslations("vehicles");

  const overview = await getMaintenanceOverview();

  // Sort: overdue vehicles first, then by name
  const sorted = [...overview].sort((a, b) => {
    const aOverdue = a.schedules.some((s) => s.isOverdue);
    const bOverdue = b.schedules.some((s) => s.isOverdue);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <Topbar title={t("overview")} showBack />
      <div className="px-4 py-4 space-y-3">
        {sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {t("noSchedules")}
          </p>
        ) : (
          sorted.map((vehicle) => {
            const overdueSchedules = vehicle.schedules.filter((s) => s.isOverdue);
            const hasOverdue = overdueSchedules.length > 0;

            return (
              <Link
                key={vehicle.id}
                href={`/${locale}/admin/vehicles/${vehicle.id}`}
                className="block bg-card border border-border rounded-xl p-4 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">
                        {vehicle.name}
                      </p>
                      {vehicle.registrationNumber && (
                        <span className="text-xs text-muted-foreground">
                          {vehicle.registrationNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tVehicles("engineHours")}: {Number(vehicle.currentEngineHours).toLocaleString()} {t("hrs")}
                    </p>
                  </div>

                  {hasOverdue ? (
                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700 flex-shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {overdueSchedules.length} {t("overdue")}
                    </div>
                  ) : vehicle.schedules.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                      <CheckCircle className="h-3.5 w-3.5" />
                      OK
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground flex-shrink-0">
                      <Wrench className="h-3.5 w-3.5" />
                      {t("noSchedules")}
                    </div>
                  )}
                </div>

                {vehicle.schedules.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {vehicle.schedules.map((s) => (
                      <span
                        key={s.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          s.isOverdue
                            ? "bg-red-100 text-red-700"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {t(`serviceTypes.${s.type}` as Parameters<typeof t>[0])}
                        {s.nextDueHours && ` · ${s.nextDueHours} ${t("hrs")}`}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
