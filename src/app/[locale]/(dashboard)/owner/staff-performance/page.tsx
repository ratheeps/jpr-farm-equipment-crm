import { Topbar } from "@/components/layout/topbar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getStaffPerformance } from "@/lib/actions/reports";
import { PerformanceSummary } from "@/components/staff/performance-summary";

function getMonthBounds() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().split("T")[0];
  return { start, end: today };
}

export default async function StaffPerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { locale } = await params;
  const { from, to } = await searchParams;

  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin", "auditor"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const month = getMonthBounds();
  const dateFrom = from ?? month.start;
  const dateTo = to ?? month.end;

  const performance = await getStaffPerformance(dateFrom, dateTo);

  return (
    <div>
      <Topbar title="Staff Performance" showBack />
      <div className="px-4 py-4 space-y-4">
        {/* Date filter hint */}
        <p className="text-xs text-muted-foreground">
          Showing: {dateFrom} → {dateTo}
        </p>

        <PerformanceSummary rows={performance} />
      </div>
    </div>
  );
}
