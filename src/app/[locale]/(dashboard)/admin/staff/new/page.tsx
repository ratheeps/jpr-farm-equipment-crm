import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { StaffForm } from "@/components/forms/staff-form";

export default async function NewStaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("staff");
  return (
    <div>
      <Topbar title={t("add")} showBack />
      <div className="px-4 py-4">
        <StaffForm locale={locale} />
      </div>
    </div>
  );
}
