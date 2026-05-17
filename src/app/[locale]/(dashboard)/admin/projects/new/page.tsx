import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectForm } from "@/components/forms/project-form";

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("projects");

  return (
    <div>
      <PageHeader title={t("add")} back />
      <div className="px-4 py-4">
        <ProjectForm locale={locale} />
      </div>
    </div>
  );
}
