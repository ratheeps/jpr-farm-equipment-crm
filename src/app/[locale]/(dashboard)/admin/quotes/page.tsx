import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getQuotes } from "@/lib/actions/quotes";
import { QuoteListCard } from "@/components/quotes/quote-list-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function QuotesPage({
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

  const t = await getTranslations("quotes");

  const allQuotes = await getQuotes();
  const canDelete = session.role === "super_admin";

  return (
    <div>
      <Topbar title={t("title")} showBack />
      <div className="px-4 py-4">
        <Link
          href={`/${locale}/admin/quotes/new`}
          className="flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold mb-4"
        >
          <Plus className="h-5 w-5" />
          {t("add")}
        </Link>

        {allQuotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("noQuotes")}
            description={t("noQuotesDesc")}
            actionLabel={t("add")}
            actionHref={`/${locale}/admin/quotes/new`}
          />
        ) : (
          <div className="space-y-3">
            {allQuotes.map((q) => (
              <QuoteListCard key={q.id} q={q} locale={locale} canDelete={canDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
