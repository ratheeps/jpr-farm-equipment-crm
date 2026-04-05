import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getProjects } from "@/lib/actions/projects";
import Link from "next/link";
import { Plus, FolderKanban } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ProjectListCard } from "@/components/projects/project-list-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const t = await getTranslations("projects");

  const allProjects = await getProjects();
  const canDelete = session.role === "super_admin";

  return (
    <div>
      <Topbar title={t("title")} />
      <div className="px-4 py-4">
        <Link
          href={`/${locale}/admin/projects/new`}
          className="flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold mb-4"
        >
          <Plus className="h-5 w-5" />
          {t("add")}
        </Link>

        {allProjects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={t("noProjects")}
            description={t("noProjectsDesc")}
            actionLabel={t("add")}
            actionHref={`/${locale}/admin/projects/new`}
          />
        ) : (
          <div className="space-y-3">
            {allProjects.map((p) => (
              <ProjectListCard
                key={p.id}
                p={p}
                locale={locale}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
