import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ReceivableForm } from "@/components/forms/receivable-form";
import { db } from "@/db";
import { projects } from "@/db/schema";

export default async function NewReceivablePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("finance");

  const allProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .orderBy(projects.name);

  return (
    <div>
      <PageHeader title={t("addLending")} back />
      <div className="px-4 py-4">
        <ReceivableForm locale={locale} availableProjects={allProjects} />
      </div>
    </div>
  );
}
