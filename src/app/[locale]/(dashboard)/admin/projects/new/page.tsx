import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
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
      <Topbar title={t("add")} showBack />
      <div className="px-4 py-4">
        <ProjectForm locale={locale} />
      </div>
    </div>
  );
}
