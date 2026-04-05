import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { Topbar } from "@/components/layout/topbar";
import Link from "next/link";
import { Plus, Car } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ilike, or, sql } from "drizzle-orm";
import { ListSearch } from "@/components/layout/list-search";
import { Pagination } from "@/components/layout/pagination";
import { Suspense } from "react";
import { VehicleListCard } from "@/components/vehicles/vehicle-list-card";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE_SIZE = 20;

export default async function VehiclesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { q, page: pageStr } = await searchParams;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const t = await getTranslations("vehicles");

  const page = Math.max(0, parseInt(pageStr ?? "0", 10));
  const where = q
    ? or(ilike(vehicles.name, `%${q}%`), ilike(vehicles.registrationNumber, `%${q}%`))
    : undefined;

  const [allVehicles, [{ count }]] = await Promise.all([
    db.select().from(vehicles).where(where).orderBy(vehicles.name).limit(PAGE_SIZE).offset(page * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)` }).from(vehicles).where(where),
  ]);

  const totalPages = Math.ceil(Number(count) / PAGE_SIZE);
  const canDelete = session.role === "super_admin";

  return (
    <div>
      <Topbar title={t("title")} />
      <div className="px-4 py-4">
        {/* Add button */}
        <Link
          href={`/${locale}/admin/vehicles/new`}
          className="flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold mb-4"
        >
          <Plus className="h-5 w-5" />
          {t("add")}
        </Link>

        {/* Search */}
        <Suspense>
          <ListSearch placeholder="Search" />
        </Suspense>

        {/* Vehicle cards */}
        {allVehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title={t("noVehicles")}
            description={t("noVehiclesDesc")}
            actionLabel={t("add")}
            actionHref={`/${locale}/admin/vehicles/new`}
          />
        ) : (
          <>
            <div className="space-y-3">
              {allVehicles.map((v) => (
                <VehicleListCard
                  key={v.id}
                  v={v}
                  locale={locale}
                  canDelete={canDelete}
                />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath={`/${locale}/admin/vehicles`}
              query={q}
            />
          </>
        )}
      </div>
    </div>
  );
}
