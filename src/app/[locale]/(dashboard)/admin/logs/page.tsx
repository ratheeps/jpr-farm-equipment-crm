import { db } from "@/db";
import { vehicles, staffProfiles } from "@/db/schema";
import { Topbar } from "@/components/layout/topbar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Pagination } from "@/components/layout/pagination";
import { Suspense } from "react";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { getLogsForAdmin, type AdminLogFilters } from "@/lib/actions/admin-logs";
import { LogFilterBar } from "@/components/admin/log-filter-bar";
import { AdminLogList } from "@/components/admin/admin-log-list";
import { ExportCsvButton } from "@/components/admin/export-csv-button";

export default async function AdminLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const filters: AdminLogFilters = {
    vehicleId: sp.vehicleId,
    operatorId: sp.operatorId,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    syncStatus: sp.syncStatus,
    page: Math.max(0, parseInt(sp.page ?? "0", 10)),
  };

  const [{ rows, totalCount, page, pageSize }, allVehicles, allOperators] = await Promise.all([
    getLogsForAdmin(filters),
    db.select({ id: vehicles.id, name: vehicles.name }).from(vehicles).orderBy(vehicles.name),
    db.select({ id: staffProfiles.id, fullName: staffProfiles.fullName }).from(staffProfiles).orderBy(staffProfiles.fullName),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <Topbar title="Daily Logs" />
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="text-lg font-semibold">Daily Logs</p>
        <ExportCsvButton filters={filters} />
      </div>
      <div className="px-4 py-4">
        <Suspense>
          <LogFilterBar vehicles={allVehicles} operators={allOperators} />
        </Suspense>

        {rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No logs found"
            description="Adjust your filters or wait for operators to log work."
          />
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">{totalCount} log(s) found</p>
            <AdminLogList logs={rows} />
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath={`/${locale}/admin/logs`}
              query={sp.q}
            />
          </>
        )}
      </div>
    </div>
  );
}
