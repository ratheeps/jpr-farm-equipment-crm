import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { ProjectForm } from "@/components/forms/project-form";
import { ProjectAssignments } from "@/components/projects/project-assignments";
import { getProject } from "@/lib/actions/projects";
import { getActiveVehicles } from "@/lib/actions/daily-logs";
import { db } from "@/db";
import { staffProfiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const t = await getTranslations("projects");

  const [result, vehicles, staff] = await Promise.all([
    getProject(id),
    getActiveVehicles(),
    db
      .select({ id: staffProfiles.id, fullName: staffProfiles.fullName })
      .from(staffProfiles)
      .orderBy(staffProfiles.fullName),
  ]);

  if (!result) redirect(`/${locale}/admin/projects`);

  const { project, assignments } = result;

  return (
    <div>
      <Topbar title={t("edit")} showBack />
      <div className="px-4 py-4">
        <ProjectForm
          locale={locale}
          initial={{
            id: project.id,
            name: project.name,
            clientName: project.clientName,
            clientPhone: project.clientPhone,
            siteLocationText: project.siteLocationText,
            status: project.status,
            estimatedHours: project.estimatedHours,
            estimatedCost: project.estimatedCost,
            mobilizationFee: project.mobilizationFee,
            startDate: project.startDate,
            endDate: project.endDate,
            notes: project.notes,
          }}
        />

        <div className="border-t border-border pt-4">
          <ProjectAssignments
            projectId={project.id}
            assignments={assignments}
            availableVehicles={vehicles}
            availableStaff={staff}
          />
        </div>
      </div>
    </div>
  );
}
