import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import type { RoleNavKey } from "@/lib/nav-config";

function getRoleNavKey(role: string): RoleNavKey {
  switch (role) {
    case "super_admin":
      return "owner";
    case "admin":
      return "admin";
    case "operator":
      return "operator";
    case "auditor":
      return "auditor";
    case "finance":
      return "finance";
    default:
      return "operator";
  }
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await getSession();
  const { locale } = await params;
  if (!session) {
    redirect(`/${locale}/login`);
  }

  const navKey = getRoleNavKey(session.role);
  return <AppShell role={navKey}>{children}</AppShell>;
}
