import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getLoans, getReceivables, getFinanceSummary } from "@/lib/actions/finance";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

const loanStatusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  defaulted: "bg-red-100 text-red-700",
};

const receivableStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  partial: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  written_off: "bg-gray-100 text-gray-700",
};

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
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("noLoans")}
            </p>
          ) : (
            <div className="space-y-2">
              {allLoans.map((loan) => (
                <Link
                  key={loan.id}
                  href={`/${locale}/owner/finance/loans/${loan.id}`}
                  className="block bg-card border border-border rounded-xl p-4 active:scale-98 transition-transform"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {loan.lenderName}
                      </p>
                      {loan.vehicleName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {loan.vehicleName}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        loanStatusColors[loan.status] ??
                        "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {t(`loanStatuses.${loan.status}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {t(`loanTypes.${loan.loanType}` as Parameters<typeof t>[0])}
                    </span>
                    <span className="text-xs font-medium text-destructive ml-auto">
                      {t("outstanding")}: Rs.{" "}
                      {Number(loan.outstandingBalance).toLocaleString()}
                    </span>
                  </div>
                </Link>
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
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("noReceivables")}
            </p>
          ) : (
            <div className="space-y-2">
              {allReceivables.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/${locale}/owner/finance/receivables/${rec.id}`}
                  className="block bg-card border border-border rounded-xl p-4 active:scale-98 transition-transform"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {rec.debtorName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(`receivableTypes.${rec.type}` as Parameters<typeof t>[0])}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        receivableStatusColors[rec.status] ??
                        "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {t(`receivableStatuses.${rec.status}` as Parameters<typeof t>[0])}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {rec.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due: {rec.dueDate}
                      </span>
                    )}
                    <span className="text-xs font-medium text-green-600 ml-auto">
                      {t("outstanding")}: Rs.{" "}
                      {Number(rec.outstandingBalance).toLocaleString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
