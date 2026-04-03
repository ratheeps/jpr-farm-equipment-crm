import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { OfflineBanner } from "@/components/offline-banner";
import { ExpenseForm } from "@/components/operator/expense-form";
import { getMyExpenses } from "@/lib/actions/expenses";
import { getActiveVehicles } from "@/lib/actions/daily-logs";
import { Receipt } from "lucide-react";

const categoryColors: Record<string, string> = {
  fuel: "bg-orange-100 text-orange-700",
  parts: "bg-blue-100 text-blue-700",
  repair: "bg-red-100 text-red-700",
  labor: "bg-purple-100 text-purple-700",
  transport: "bg-cyan-100 text-cyan-700",
  misc: "bg-gray-100 text-gray-700",
  seeds: "bg-green-100 text-green-700",
  fertilizer: "bg-lime-100 text-lime-700",
  pesticide: "bg-yellow-100 text-yellow-700",
  water: "bg-sky-100 text-sky-700",
};

export default async function OperatorExpensesPage() {
  const t = await getTranslations("operator");
  const tCat = await getTranslations("expenses.categories");

  const [myExpenses, vehicles] = await Promise.all([
    getMyExpenses(30),
    getActiveVehicles(),
  ]);

  const totalToday = myExpenses
    .filter(
      (e) =>
        e.date === new Date().toISOString().split("T")[0]
    )
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <div>
      <Topbar title={t("expenses")} showBack />
      <OfflineBanner />
      <div className="px-4 py-6 space-y-4">
        {/* Today's total */}
        {totalToday > 0 && (
          <div className="rounded-2xl bg-muted px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Today&apos;s total</span>
            <span className="font-bold text-foreground">
              Rs. {totalToday.toLocaleString()}
            </span>
          </div>
        )}

        <ExpenseForm
          vehicles={vehicles.map((v) => ({ id: v.id, name: v.name }))}
        />

        <div className="space-y-3">
          {myExpenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t("noExpenses")}</p>
            </div>
          ) : (
            myExpenses.map((exp) => (
              <div
                key={exp.id}
                className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                      categoryColors[exp.category] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {tCat(exp.category as never)}
                  </span>
                  <div className="min-w-0">
                    {exp.description && (
                      <p className="text-sm truncate text-foreground">
                        {exp.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {exp.date}
                      {exp.vehicleName ? ` · ${exp.vehicleName}` : ""}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-semibold text-foreground">
                  Rs. {parseFloat(exp.amount).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
