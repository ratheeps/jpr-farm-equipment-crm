import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { FileText, TrendingUp, ArrowRightLeft, Download } from "lucide-react";
import Link from "next/link";

export default async function AuditorDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("nav");
  const tf = await getTranslations("finance");

  const sections = [
    {
      href: `/${locale}/auditor/reports`,
      icon: FileText,
      label: t("reports"),
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
    },
    {
      href: `/${locale}/auditor/finance`,
      icon: TrendingUp,
      label: tf("title"),
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
    },
    {
      href: `/${locale}/auditor/transactions`,
      icon: ArrowRightLeft,
      label: t("transactions"),
      color: "text-purple-600",
      bg: "bg-purple-50 border-purple-200",
    },
    {
      href: `/${locale}/auditor/export`,
      icon: Download,
      label: t("export"),
      color: "text-orange-600",
      bg: "bg-orange-50 border-orange-200",
    },
  ];

  return (
    <div>
      <Topbar title="JPR" />
      <div className="px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Read-only financial view
        </p>
        <div className="grid grid-cols-2 gap-3">
          {sections.map(({ href, icon: Icon, label, color, bg }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border ${bg} active:scale-95 transition-transform`}
            >
              <Icon className={`h-8 w-8 ${color}`} />
              <span className="text-sm font-medium text-foreground text-center px-2">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
