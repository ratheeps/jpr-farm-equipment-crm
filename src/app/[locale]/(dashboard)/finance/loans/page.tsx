import { getTranslations } from "next-intl/server";

export default async function FinanceLoansPage() {
  const t = await getTranslations("financeRoutes");
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">{t("loansTitle")}</h1>
      <p className="text-muted-foreground">{t("loansPlaceholder")}</p>
    </div>
  );
}
