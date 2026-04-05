import { Topbar } from "@/components/layout/topbar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getCompanySettings } from "@/lib/actions/company-settings";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";

export default async function CompanySettingsPage({
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

  const settings = await getCompanySettings();

  return (
    <div>
      <Topbar title="Company Settings" showBack />
      <div className="px-4 py-4">
        <CompanySettingsForm settings={settings} />
      </div>
    </div>
  );
}
