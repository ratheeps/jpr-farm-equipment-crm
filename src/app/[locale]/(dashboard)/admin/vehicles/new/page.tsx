import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { VehicleForm } from "@/components/forms/vehicle-form";

export default async function NewVehiclePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("vehicles");

  return (
    <div>
      <Topbar title={t("add")} showBack />
      <div className="px-4 py-4">
        <VehicleForm locale={locale} />
      </div>
    </div>
  );
}
