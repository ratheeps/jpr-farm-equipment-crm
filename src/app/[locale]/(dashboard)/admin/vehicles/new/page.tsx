import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
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
      <PageHeader title={t("add")} back />
      <div className="px-4 py-4">
        <VehicleForm locale={locale} />
      </div>
    </div>
  );
}
