import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
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
      <PageHeader title={t("add")} back />
      <div className="px-4 py-4">
        <StaffForm locale={locale} />
      </div>
    </div>
  );
}
