import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { FarmForm } from "@/components/forms/farm-form";

export default async function NewFarmPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("farms");

  return (
    <div>
      <PageHeader title={t("add")} back />
      <div className="px-4 py-4">
        <FarmForm locale={locale} />
      </div>
    </div>
  );
}
