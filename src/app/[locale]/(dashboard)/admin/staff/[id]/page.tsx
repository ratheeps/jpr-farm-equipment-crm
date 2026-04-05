import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { StaffForm } from "@/components/forms/staff-form";
import { getStaff } from "@/lib/actions/staff";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function StaffDetailPage({
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

  const t = await getTranslations("staff");

  const staff = await getStaff(id);
  if (!staff) redirect(`/${locale}/admin/staff`);

  return (
    <div>
      <Topbar title={staff.fullName ?? staff.phone} showBack />
      <div className="px-4 py-4">
        <StaffForm
          locale={locale}
          initial={{
            userId: staff.userId,
            phone: staff.phone,
            role: staff.role,
            preferredLocale: staff.preferredLocale,
            fullName: staff.fullName,
            staffPhone: staff.staffPhone,
            nicNumber: staff.nicNumber,
            payRate: staff.payRate,
            payType: staff.payType,
          }}
        />
      </div>
    </div>
  );
}
