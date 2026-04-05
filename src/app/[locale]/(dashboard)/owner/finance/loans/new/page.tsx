import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { LoanForm } from "@/components/forms/loan-form";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function NewLoanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("finance");

  const activeVehicles = await db
    .select({ id: vehicles.id, name: vehicles.name })
    .from(vehicles)
    .where(eq(vehicles.status, "active"));

  return (
    <div>
      <Topbar title={t("addLoan")} showBack />
      <div className="px-4 py-4">
        <LoanForm locale={locale} availableVehicles={activeVehicles} />
      </div>
    </div>
  );
}
