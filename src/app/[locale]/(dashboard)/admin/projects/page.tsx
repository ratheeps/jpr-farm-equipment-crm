import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getProjects } from "@/lib/actions/projects";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  invoiced: "bg-purple-100 text-purple-700",
};

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
  const tCommon = await getTranslations("common");

  const allProjects = await getProjects();

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
          <p className="text-center text-muted-foreground py-12">
            {tCommon("noData")}
          </p>
        ) : (
          <div className="space-y-3">
            {allProjects.map((p) => (
              <Link
                key={p.id}
                href={`/${locale}/admin/projects/${p.id}`}
                className="block bg-card border border-border rounded-xl p-4 active:scale-98 transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {p.name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {p.clientName}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      statusColors[p.status] ?? "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {t(`statuses.${p.status}` as Parameters<typeof t>[0])}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {(p.startDate || p.endDate) && (
                    <span className="text-xs text-muted-foreground">
                      {p.startDate ?? "—"} → {p.endDate ?? "—"}
                    </span>
                  )}
                  {p.estimatedCost && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      Rs. {Number(p.estimatedCost).toLocaleString()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
