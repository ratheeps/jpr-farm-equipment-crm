import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { QuoteForm } from "@/components/forms/quote-form";
import { generateQuoteNumber } from "@/lib/actions/quotes";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function NewQuotePage({
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

  const [quoteNumber, allProjects] = await Promise.all([
    generateQuoteNumber(),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .orderBy(projects.name),
  ]);

  return (
    <div>
      <Topbar title={t("add")} showBack />
      <div className="px-4 py-4">
        <QuoteForm
          locale={locale}
          projects={allProjects}
          generatedNumber={quoteNumber}
        />
      </div>
    </div>
  );
}
