import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { FarmForm } from "@/components/forms/farm-form";
import { FarmCycles } from "@/components/farms/farm-cycles";
import { FarmSummary } from "@/components/farms/farm-summary";
import { getFarm, getFarmSummary } from "@/lib/actions/farms";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function FarmDetailPage({
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

  const t = await getTranslations("farms");

  const [farm, summary] = await Promise.all([
    getFarm(id),
    getFarmSummary(id),
  ]);

  if (!farm) redirect(`/${locale}/admin/farms`);

  return (
    <div>
      <Topbar title={t("edit")} showBack />
      <div className="px-4 py-4">
        {summary && (summary.totalInputCost > 0 || summary.totalRevenue > 0) && (
          <FarmSummary summary={summary} />
        )}

        <FarmForm
          locale={locale}
          initial={{
            id: farm.id,
            name: farm.name,
            areaAcres: farm.areaAcres,
            locationText: farm.locationText,
            gpsLat: farm.gpsLat,
            gpsLng: farm.gpsLng,
            soilType: farm.soilType,
            waterSource: farm.waterSource,
            isActive: farm.isActive,
          }}
        />

        <div className="border-t border-border pt-4">
          <FarmCycles farmId={farm.id} cycles={farm.cycles} />
        </div>
      </div>
    </div>
  );
}
