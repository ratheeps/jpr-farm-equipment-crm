import { Topbar } from "@/components/layout/topbar";
import { QuoteForm } from "@/components/forms/quote-form";
import { ConvertToInvoiceButton } from "@/components/quotes/convert-button";
import { QuoteActions } from "@/components/quotes/quote-actions";
import { getQuote } from "@/lib/actions/quotes";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { projects } from "@/db/schema";

export default async function QuoteDetailPage({
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

  const [result, allProjects] = await Promise.all([
    getQuote(id),
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
  ]);

  if (!result) redirect(`/${locale}/admin/quotes`);
  const { quote, items } = result;

  const projectName = allProjects.find((p) => p.id === quote.projectId)?.name ?? null;

  return (
    <div>
      <Topbar title={quote.quoteNumber} showBack />

      <QuoteActions
        data={{
          quoteNumber: quote.quoteNumber,
          clientName: quote.clientName,
          clientPhone: quote.clientPhone,
          projectName,
          createdAt: quote.createdAt.toLocaleDateString("en-LK"),
          validUntil: quote.validUntil,
          subtotal: quote.subtotal,
          total: quote.total,
          notes: quote.notes,
          items: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.amount,
          })),
        }}
      />

      <div className="px-4 pb-4 space-y-4">
        <ConvertToInvoiceButton quoteId={quote.id} locale={locale} />

        <QuoteForm
          locale={locale}
          projects={allProjects}
          initial={{
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            projectId: quote.projectId,
            clientName: quote.clientName,
            clientPhone: quote.clientPhone,
            subtotal: quote.subtotal,
            total: quote.total,
            validUntil: quote.validUntil,
            notes: quote.notes,
            items: items.map((item) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              rate: item.rate,
              amount: item.amount,
              sortOrder: item.sortOrder,
            })),
          }}
        />
      </div>
    </div>
  );
}
