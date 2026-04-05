import { Topbar } from "@/components/layout/topbar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getPayrollList } from "@/lib/actions/payroll";
import { PayrollManager } from "@/components/staff/payroll-manager";

function getMonthBounds() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
  return { start, end };
}

export default async function PayrollPage({
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
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const month = getMonthBounds();
  const periodStart = from ?? month.start;
  const periodEnd = to ?? month.end;

  const payroll = await getPayrollList({ periodStart, periodEnd });

  return (
    <div>
      <Topbar title="Payroll" showBack />
      <div className="px-4 py-4">
        <PayrollManager
          initialPayroll={payroll}
          isSuperAdmin={session.role === "super_admin"}
          defaultPeriodStart={periodStart}
          defaultPeriodEnd={periodEnd}
        />
      </div>
    </div>
  );
}
