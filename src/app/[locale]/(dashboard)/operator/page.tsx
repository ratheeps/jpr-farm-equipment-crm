import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import Link from "next/link";
import { Clock, Receipt, History } from "lucide-react";

export default async function OperatorDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("operator");

  return (
    <div>
      <Topbar title="JPR" />
      <div className="px-4 py-6 space-y-4">
        {/* Big Start Work button */}
        <Link
          href={`/${locale}/operator/log`}
          className="flex flex-col items-center justify-center gap-3 w-full h-40 bg-primary text-primary-foreground rounded-2xl shadow-md active:scale-95 transition-transform"
        >
          <Clock className="h-12 w-12" />
          <span className="text-xl font-bold">{t("startWork")}</span>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/${locale}/operator/expenses`}
            className="flex flex-col items-center justify-center gap-2 h-24 bg-card border border-border rounded-xl active:scale-95 transition-transform"
          >
            <Receipt className="h-7 w-7 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {t("expenses")}
            </span>
          </Link>
          <Link
            href={`/${locale}/operator/history`}
            className="flex flex-col items-center justify-center gap-2 h-24 bg-card border border-border rounded-xl active:scale-95 transition-transform"
          >
            <History className="h-7 w-7 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {t("history")}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
