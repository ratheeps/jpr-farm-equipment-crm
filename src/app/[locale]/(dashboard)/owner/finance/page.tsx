import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getLoans, getReceivables, getFinanceSummary } from "@/lib/actions/finance";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, DollarSign, TrendingDown } from "lucide-react";
import { LoanListCard, ReceivableListCard } from "@/components/finance/finance-list-cards";
import { EmptyState } from "@/components/ui/empty-state";

export default async function OwnerFinancePage({
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

  const t = await getTranslations("finance");

  const [summary, allLoans, allReceivables] = await Promise.all([
    getFinanceSummary(),
    getLoans(),
    getReceivables(),
  ]);

  const canDelete = session.role === "super_admin";

  return (
    <div>
      <Topbar title={t("title")} />
      <div className="px-4 py-4 space-y-5">

        {/* Summary card */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {t("totalDebt")}
              </p>
              <p className="text-lg font-bold text-destructive">
                Rs. {summary.totalDebt.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {t("receivables")}
              </p>
              <p className="text-lg font-bold text-green-600">
                Rs. {summary.totalReceivables.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {t("netWorth")}
              </p>
              <p
                className={`text-lg font-bold ${
                  summary.netWorth >= 0 ? "text-green-600" : "text-destructive"
                }`}
              >
                Rs. {summary.netWorth.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {t("monthlyEmi")}
              </p>
              <p className="text-lg font-bold text-foreground">
                Rs. {summary.monthlyEmi.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Loans section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">
              {t("loans")}
            </h2>
            <Link
              href={`/${locale}/owner/finance/loans/new`}
              className="flex items-center gap-1.5 h-9 px-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              {t("addLoan")}
            </Link>
          </div>

          {allLoans.length === 0 ? (
            <EmptyState
              icon={TrendingDown}
              title={t("noLoans")}
              actionLabel={t("addLoan")}
              actionHref={`/${locale}/owner/finance/loans/new`}
            />
          ) : (
            <div className="space-y-2">
              {allLoans.map((loan) => (
                <LoanListCard
                  key={loan.id}
                  loan={loan}
                  locale={locale}
                  canDelete={canDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Receivables section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">
              {t("receivables")}
            </h2>
            <Link
              href={`/${locale}/owner/finance/receivables/new`}
              className="flex items-center gap-1.5 h-9 px-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              {t("addLending")}
            </Link>
          </div>

          {allReceivables.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title={t("noReceivables")}
              actionLabel={t("addLending")}
              actionHref={`/${locale}/owner/finance/receivables/new`}
            />
          ) : (
            <div className="space-y-2">
              {allReceivables.map((rec) => (
                <ReceivableListCard
                  key={rec.id}
                  rec={rec}
                  locale={locale}
                  canDelete={canDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
