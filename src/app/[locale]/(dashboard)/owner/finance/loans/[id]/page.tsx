import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { LoanForm } from "@/components/forms/loan-form";
import { LoanPayments } from "@/components/finance/loan-payments";
import { getLoan } from "@/lib/actions/finance";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const t = await getTranslations("finance");

  const [result, activeVehicles] = await Promise.all([
    getLoan(id),
    db
      .select({ id: vehicles.id, name: vehicles.name })
      .from(vehicles)
      .where(eq(vehicles.status, "active")),
  ]);

  if (!result) redirect(`/${locale}/owner/finance`);
  const { loan, payments } = result;

  return (
    <div>
      <Topbar title={t("editLoan")} showBack />
      <div className="px-4 py-4">
        <LoanForm
          locale={locale}
          availableVehicles={activeVehicles}
          initial={{
            id: loan.id,
            loanType: loan.loanType,
            lenderName: loan.lenderName,
            lenderPhone: loan.lenderPhone,
            principalAmount: loan.principalAmount,
            interestRatePercent: loan.interestRatePercent,
            interestType: loan.interestType,
            termMonths: loan.termMonths,
            emiAmount: loan.emiAmount,
            startDate: loan.startDate,
            endDate: loan.endDate,
            vehicleId: loan.vehicleId,
            notes: loan.notes,
          }}
        />
        <div className="border-t border-border pt-4">
          <LoanPayments
            loanId={loan.id}
            payments={payments}
            outstandingBalance={loan.outstandingBalance}
            emiAmount={loan.emiAmount}
          />
        </div>
      </div>
    </div>
  );
}
