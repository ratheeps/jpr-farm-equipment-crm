import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { db } from "@/db";
import { users, staffProfiles } from "@/db/schema";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ilike, or, eq, sql } from "drizzle-orm";
import { ListSearch } from "@/components/layout/list-search";
import { Pagination } from "@/components/layout/pagination";
import { Suspense } from "react";
import { StaffListCard } from "@/components/staff/staff-list-card";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE_SIZE = 20;

export default async function StaffPage({
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

  const t = await getTranslations("staff");

  const page = Math.max(0, parseInt(pageStr ?? "0", 10));

  const where = q
    ? or(ilike(staffProfiles.fullName, `%${q}%`), ilike(staffProfiles.phone, `%${q}%`))
    : undefined;

  const [staffList, [{ count }]] = await Promise.all([
    db
      .select({
        userId: users.id,
        phone: users.phone,
        role: users.role,
        fullName: staffProfiles.fullName,
      })
      .from(users)
      .leftJoin(staffProfiles, eq(staffProfiles.userId, users.id))
      .where(where)
      .orderBy(staffProfiles.fullName)
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE),
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .leftJoin(staffProfiles, eq(staffProfiles.userId, users.id))
      .where(where),
  ]);

  const totalPages = Math.ceil(Number(count) / PAGE_SIZE);
  const canDeactivate = session.role === "super_admin";

  return (
    <div>
      <Topbar title={t("title")} />
      <div className="px-4 py-4">
        <Link
          href={`/${locale}/admin/staff/new`}
          className="flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold mb-4"
        >
          <Plus className="h-5 w-5" />
          {t("add")}
        </Link>

        <Suspense>
          <ListSearch placeholder="Search" />
        </Suspense>

        {staffList.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("noStaff")}
            description={t("noStaffDesc")}
            actionLabel={t("add")}
            actionHref={`/${locale}/admin/staff/new`}
          />
        ) : (
          <>
            <div className="space-y-3">
              {staffList.map((s) => (
                <StaffListCard
                  key={s.userId}
                  s={s}
                  locale={locale}
                  canDeactivate={canDeactivate}
                />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath={`/${locale}/admin/staff`}
              query={q}
            />
          </>
        )}
      </div>
    </div>
  );
}
