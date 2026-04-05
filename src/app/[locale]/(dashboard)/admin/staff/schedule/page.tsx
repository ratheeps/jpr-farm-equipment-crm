import { Topbar } from "@/components/layout/topbar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getSchedule, getScheduleFormData } from "@/lib/actions/schedules";
import { ScheduleManager } from "@/components/staff/schedule-manager";

function getWeekBounds(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: monday.toISOString().split("T")[0],
    to: sunday.toISOString().split("T")[0],
  };
}

export default async function StaffSchedulePage({
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

  const week = getWeekBounds();
  const dateFrom = from ?? week.from;
  const dateTo = to ?? week.to;

  const [schedule, formData] = await Promise.all([
    getSchedule(dateFrom, dateTo),
    getScheduleFormData(),
  ]);

  return (
    <div>
      <Topbar title="Operator Schedule" showBack />
      <div className="px-4 py-4">
        <ScheduleManager
          initialSchedule={schedule}
          staff={formData.staff}
          vehicles={formData.vehicles}
          projects={formData.projects}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      </div>
    </div>
  );
}
