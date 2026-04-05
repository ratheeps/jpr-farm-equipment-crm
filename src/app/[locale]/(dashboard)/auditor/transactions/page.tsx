import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getCashTransactions } from "@/lib/actions/finance";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

const typeColors: Record<string, string> = {
  income: "bg-green-100 text-green-700",
  expense: "bg-red-100 text-red-700",
  loan_payment: "bg-orange-100 text-orange-700",
  lease_payment: "bg-orange-100 text-orange-700",
  lending_out: "bg-blue-100 text-blue-700",
  repayment_received: "bg-green-100 text-green-700",
  borrowing_in: "bg-purple-100 text-purple-700",
  debt_repayment: "bg-yellow-100 text-yellow-700",
};

const amountColors: Record<string, string> = {
  income: "text-green-600",
  repayment_received: "text-green-600",
  expense: "text-destructive",
  loan_payment: "text-destructive",
  lease_payment: "text-destructive",
  lending_out: "text-blue-600",
  borrowing_in: "text-purple-600",
  debt_repayment: "text-destructive",
};

export default async function AuditorTransactionsPage({
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

  const transactions = await getCashTransactions();

  return (
    <div>
      <Topbar title={t("transactions")} showBack />
      <div className="px-4 py-4">
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {t("noTransactions")}
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-card border border-border rounded-xl px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          typeColors[tx.transactionType] ??
                          "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {t(`transactionTypes.${tx.transactionType}` as Parameters<typeof t>[0])}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tx.transactionDate}
                      </span>
                    </div>
                    {tx.description && (
                      <p className="text-sm text-foreground mt-1 truncate">
                        {tx.description}
                      </p>
                    )}
                  </div>
                  <p
                    className={`text-sm font-semibold flex-shrink-0 ${
                      amountColors[tx.transactionType] ?? "text-foreground"
                    }`}
                  >
                    Rs. {Number(tx.amount).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
