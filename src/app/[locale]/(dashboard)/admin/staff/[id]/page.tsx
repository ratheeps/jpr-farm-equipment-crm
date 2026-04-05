import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { StaffForm } from "@/components/forms/staff-form";
import { StaffProfile } from "@/components/staff/staff-profile";
import { StaffWorkHistory } from "@/components/staff/staff-work-history";
import {
  getStaffProfileDetails,
  getStaffWorkHistory,
} from "@/lib/actions/staff";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function StaffDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, id } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? "1") || 1);

  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const t = await getTranslations("staff");

  const [staffData, workHistory] = await Promise.all([
    getStaffProfileDetails(id),
    getStaffWorkHistory(id, page, 20),
  ]);

  if (!staffData) redirect(`/${locale}/admin/staff`);

  return (
    <div>
      <Topbar title={staffData.fullName ?? staffData.phone} showBack />
      <div className="px-4 py-4 space-y-6">
        {/* Profile summary */}
        <StaffProfile
          fullName={staffData.fullName}
          phone={staffData.phone}
          role={staffData.role}
          preferredLocale={staffData.preferredLocale}
          isActive={staffData.isActive}
          nicNumber={staffData.nicNumber ?? null}
          payRate={staffData.payRate ?? null}
          payType={staffData.payType ?? null}
          vehicleAssignments={staffData.vehicleAssignments}
          projectAssignments={staffData.projectAssignments}
          stats={staffData.stats}
          recentLogs={staffData.recentLogs}
        />

        {/* Edit form */}
        <div className="border-t border-border pt-6">
          <h2 className="text-base font-semibold text-foreground mb-4">{t("edit")}</h2>
          <StaffForm
            locale={locale}
            initial={{
              userId: staffData.userId,
              phone: staffData.phone,
              role: staffData.role,
              preferredLocale: staffData.preferredLocale,
              fullName: staffData.fullName,
              staffPhone: staffData.staffPhone,
              nicNumber: staffData.nicNumber,
              payRate: staffData.payRate,
              payType: staffData.payType,
            }}
          />
        </div>

        {/* Work history */}
        <div id="history" className="border-t border-border pt-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Work History</h2>
          <StaffWorkHistory
            logs={workHistory}
            page={page}
            userId={id}
            locale={locale}
            hasMore={workHistory.length === 20}
          />
        </div>
      </div>
    </div>
  );
}
