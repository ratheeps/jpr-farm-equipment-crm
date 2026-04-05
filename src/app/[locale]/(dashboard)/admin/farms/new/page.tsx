import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
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
      <Topbar title={t("add")} showBack />
      <div className="px-4 py-4">
        <FarmForm locale={locale} />
      </div>
    </div>
  );
}
