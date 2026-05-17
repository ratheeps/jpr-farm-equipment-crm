import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { Clock, Receipt, History, MapPin, Briefcase, Square } from "lucide-react";
import {
  getMyAssignedProjects,
  getTodayLog,
} from "@/lib/actions/daily-logs";

export default async function OperatorDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("operator");
  const [ongoing, activeLog] = await Promise.all([
    getMyAssignedProjects(),
    getTodayLog(),
  ]);

  const startedAt = activeLog?.startTime
    ? new Date(activeLog.startTime).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div>
      <PageHeader title="JPR" />
      <div className="px-4 py-6 space-y-4">
        {activeLog ? (
          <Link
            href={`/${locale}/operator/log`}
            className="flex flex-col items-center justify-center gap-2 w-full h-40 bg-destructive text-destructive-foreground rounded-2xl shadow-md active:scale-95 transition-transform"
          >
            <Square className="h-10 w-10" fill="currentColor" />
            <span className="text-xl font-bold">{t("endWork")}</span>
            <span className="text-xs opacity-90">
              {activeLog.vehicleName}
              {startedAt ? ` · ${startedAt}` : ""}
            </span>
          </Link>
        ) : (
          <Link
            href={`/${locale}/operator/log`}
            className="flex flex-col items-center justify-center gap-3 w-full h-40 bg-primary text-primary-foreground rounded-2xl shadow-md active:scale-95 transition-transform"
          >
            <Clock className="h-12 w-12" />
            <span className="text-xl font-bold">{t("startWork")}</span>
          </Link>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            {t("ongoingWorks")}
          </h2>
          {ongoing.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card border border-border rounded-xl px-4 py-6 text-center">
              {t("noOngoingWorks")}
            </p>
          ) : (
            <ul className="space-y-2">
              {ongoing.map((p) => (
                <li
                  key={p.id}
                  className="bg-card border border-border rounded-xl px-4 py-3"
                >
                  <p className="font-medium text-foreground truncate">
                    {p.clientName ?? "—"}
                  </p>
                  {p.siteLocation && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden />
                      <span className="truncate">{p.siteLocation}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

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
