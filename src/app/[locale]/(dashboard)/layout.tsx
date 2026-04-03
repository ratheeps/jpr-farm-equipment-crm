import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { BottomNav } from "@/components/layout/bottom-nav";

// Map role to nav section key
function getRoleNavKey(role: string): string {
  switch (role) {
    case "super_admin":
      return "owner";
    case "admin":
      return "admin";
    case "operator":
      return "operator";
    case "auditor":
      return "auditor";
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

  return (
    <div className="min-h-screen bg-background">
      {/* Main content — padded bottom for bottom nav height */}
      <main className="pb-20">{children}</main>
      <BottomNav role={navKey} />
    </div>
  );
}
