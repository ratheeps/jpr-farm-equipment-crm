import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { Topbar } from "@/components/layout/topbar";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Plus, Wrench, CheckCircle, XCircle } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function VehiclesPage({
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

  const t = await getTranslations("vehicles");
  const tCommon = await getTranslations("common");

  const allVehicles = await db
    .select()
    .from(vehicles)
    .orderBy(vehicles.name);

  const statusIcon = {
    active: <CheckCircle className="h-4 w-4 text-green-500" />,
    inactive: <XCircle className="h-4 w-4 text-muted-foreground" />,
    maintenance: <Wrench className="h-4 w-4 text-yellow-500" />,
  };

  return (
    <div>
      <Topbar title={t("title")} />
      <div className="px-4 py-4">
        {/* Add button */}
        <Link
          href={`/${locale}/admin/vehicles/new`}
          className="flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold mb-4"
        >
          <Plus className="h-5 w-5" />
          {t("add")}
        </Link>

        {/* Vehicle cards */}
        {allVehicles.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {tCommon("noData")}
          </p>
        ) : (
          <div className="space-y-3">
            {allVehicles.map((v) => (
              <Link
                key={v.id}
                href={`/${locale}/admin/vehicles/${v.id}`}
                className="block bg-card border border-border rounded-xl p-4 active:scale-98 transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {v.name}
                    </p>
                    {v.registrationNumber && (
                      <p className="text-xs text-muted-foreground">
                        {v.registrationNumber}
                      </p>
                    )}
                  </div>
                  {statusIcon[v.status]}
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {t(`types.${v.vehicleType}` as Parameters<typeof t>[0])}
                  </span>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {t(`billing.${v.billingModel}` as Parameters<typeof t>[0])}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {t("engineHours")}: {v.currentEngineHours}h
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
