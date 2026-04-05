import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import Link from "next/link";
import { Plus, FileText, Receipt } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { invoices, projects } from "@/db/schema";
import { InvoiceListCard } from "@/components/invoices/invoice-list-card";
import { ListSearch } from "@/components/layout/list-search";
import { Pagination } from "@/components/layout/pagination";
import { ilike, or, desc, eq, sql } from "drizzle-orm";
import { Suspense } from "react";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE_SIZE = 20;

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { q, page: pageStr } = await searchParams;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const [t, tQ, tCommon] = await Promise.all([
    getTranslations("invoices"),
    getTranslations("quotes"),
    getTranslations("common"),
  ]);

  const page = Math.max(0, parseInt(pageStr ?? "0", 10));
  const where = q
    ? or(ilike(invoices.clientName, `%${q}%`), ilike(invoices.invoiceNumber, `%${q}%`))
    : undefined;

  const [allInvoices, [{ count }]] = await Promise.all([
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        clientName: invoices.clientName,
        total: invoices.total,
        status: invoices.status,
        paymentDueDate: invoices.paymentDueDate,
        paidDate: invoices.paidDate,
        createdAt: invoices.createdAt,
        projectName: projects.name,
      })
      .from(invoices)
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(PAGE_SIZE)
      .offset(page * PAGE_SIZE),
    db.select({ count: sql<number>`count(*)` }).from(invoices).where(where),
  ]);

  const totalPages = Math.ceil(Number(count) / PAGE_SIZE);
  const canDelete = session.role === "super_admin";

  return (
    <div>
      <Topbar title={t("title")} />
      <div className="px-4 py-4">
        <Link
          href={`/${locale}/admin/invoices/new`}
          className="flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold mb-3"
        >
          <Plus className="h-5 w-5" />
          {t("add")}
        </Link>
        <Link
          href={`/${locale}/admin/quotes`}
          className="flex items-center justify-center gap-2 w-full h-11 border border-border rounded-xl text-sm font-medium text-foreground mb-4"
        >
          <FileText className="h-4 w-4" />
          {tQ("title")}
        </Link>

        <Suspense>
          <ListSearch placeholder={tCommon("search")} />
        </Suspense>

        {allInvoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t("noInvoices")}
            description={t("noInvoicesDesc")}
            actionLabel={t("add")}
            actionHref={`/${locale}/admin/invoices/new`}
          />
        ) : (
          <>
            <div className="space-y-3">
              {allInvoices.map((inv) => (
                <InvoiceListCard key={inv.id} inv={inv} locale={locale} canDelete={canDelete} />
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath={`/${locale}/admin/invoices`}
              query={q}
            />
          </>
        )}
      </div>
    </div>
  );
}
