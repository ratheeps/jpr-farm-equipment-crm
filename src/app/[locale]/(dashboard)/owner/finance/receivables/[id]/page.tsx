import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { ReceivableForm } from "@/components/forms/receivable-form";
import { ReceivablePayments } from "@/components/finance/receivable-payments";
import { getReceivable } from "@/lib/actions/finance";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { projects } from "@/db/schema";

export default async function ReceivableDetailPage({
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

  const [result, allProjects] = await Promise.all([
    getReceivable(id),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .orderBy(projects.name),
  ]);

  if (!result) redirect(`/${locale}/owner/finance`);
  const { receivable, payments } = result;

  return (
    <div>
      <Topbar title={t("editReceivable")} showBack />
      <div className="px-4 py-4">
        <ReceivableForm
          locale={locale}
          availableProjects={allProjects}
          initial={{
            id: receivable.id,
            type: receivable.type as "project_payment" | "personal_lending",
            debtorName: receivable.debtorName,
            debtorPhone: receivable.debtorPhone,
            projectId: receivable.projectId,
            principalAmount: receivable.principalAmount,
            interestRatePercent: receivable.interestRatePercent,
            totalDue: receivable.totalDue,
            dueDate: receivable.dueDate,
            notes: receivable.notes,
          }}
        />
        <div className="border-t border-border pt-4">
          <ReceivablePayments
            receivableId={receivable.id}
            payments={payments}
            outstandingBalance={receivable.outstandingBalance}
            totalDue={receivable.totalDue}
            status={receivable.status}
          />
        </div>
      </div>
    </div>
  );
}
