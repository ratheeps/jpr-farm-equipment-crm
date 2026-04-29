import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function FinanceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await getSession();
  const { locale } = await params;
  if (!session || !["finance", "admin", "super_admin"].includes(session.role)) {
    redirect(`/${locale}`);
  }
  return <>{children}</>;
}
