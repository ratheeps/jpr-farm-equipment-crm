import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getStaffList } from "@/lib/actions/staff";
import Link from "next/link";
import { Plus, UserCircle } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function StaffPage({
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

  const t = await getTranslations("staff");
  const tCommon = await getTranslations("common");

  const staffList = await getStaffList();

  const roleColors: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    operator: "bg-green-100 text-green-700",
    auditor: "bg-yellow-100 text-yellow-700",
  };

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

        {staffList.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {tCommon("noData")}
          </p>
        ) : (
          <div className="space-y-3">
            {staffList.map((s) => (
              <Link
                key={s.userId}
                href={`/${locale}/admin/staff/${s.userId}`}
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 active:scale-98 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <UserCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {s.fullName ?? s.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.phone}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                    roleColors[s.role] ?? "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {t(`roles.${s.role}` as Parameters<typeof t>[0])}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
