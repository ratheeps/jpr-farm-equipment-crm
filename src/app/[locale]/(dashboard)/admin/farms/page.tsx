import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getFarms } from "@/lib/actions/farms";
import Link from "next/link";
import { Plus, Wheat } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { FarmListCard } from "@/components/farms/farm-list-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function FarmsPage({
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

  const t = await getTranslations("farms");

  const allFarms = await getFarms();
  const canDelete = session.role === "super_admin";

  return (
    <div>
      <Topbar title={t("title")} />
      <div className="px-4 py-4">
        <Link
          href={`/${locale}/admin/farms/new`}
          className="flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold mb-4"
        >
          <Plus className="h-5 w-5" />
          {t("add")}
        </Link>

        {allFarms.length === 0 ? (
          <EmptyState
            icon={Wheat}
            title={t("noFarms")}
            description={t("noFarmsDesc")}
            actionLabel={t("add")}
            actionHref={`/${locale}/admin/farms/new`}
          />
        ) : (
          <div className="space-y-3">
            {allFarms.map((farm) => (
              <FarmListCard
                key={farm.id}
                farm={farm}
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
