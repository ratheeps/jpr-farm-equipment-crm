import { getTranslations } from "next-intl/server";

export default async function FinanceDashboardPage() {
  const t = await getTranslations("financeRoutes");
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">{t("dashboardTitle")}</h1>
      <p className="text-muted-foreground">{t("dashboardPlaceholder")}</p>
    </div>
  );
}
