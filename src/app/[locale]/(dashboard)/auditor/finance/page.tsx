import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getLoans, getReceivables, getFinanceSummary } from "@/lib/actions/finance";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

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

export default async function AuditorFinancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin", "auditor"].includes(session.role)) {
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
      <Topbar title={t("title")} showBack />
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

        {/* Loans — read-only */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">
            {t("loans")}
          </h2>
          {allLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("noLoans")}
            </p>
          ) : (
            <div className="space-y-2">
              {allLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {loan.lenderName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(`loanTypes.${loan.loanType}` as Parameters<typeof t>[0])}
                        {loan.vehicleName && ` · ${loan.vehicleName}`}
                      </p>
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
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {t("principal")}: Rs. {Number(loan.principalAmount).toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-destructive">
                      {t("outstanding")}: Rs. {Number(loan.outstandingBalance).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receivables — read-only */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">
            {t("receivables")}
          </h2>
          {allReceivables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("noReceivables")}
            </p>
          ) : (
            <div className="space-y-2">
              {allReceivables.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {rec.debtorName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(`receivableTypes.${rec.type}` as Parameters<typeof t>[0])}
                        {rec.dueDate && ` · Due: ${rec.dueDate}`}
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
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {t("totalDue")}: Rs. {Number(rec.totalDue).toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-green-600">
                      {t("outstanding")}: Rs. {Number(rec.outstandingBalance).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
