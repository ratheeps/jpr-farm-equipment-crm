import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getInvoices } from "@/lib/actions/invoices";
import { InvoiceListCard } from "@/components/invoices/invoice-list-card";

export default async function InvoicesPage({
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

  const t = await getTranslations("invoices");

  const allInvoices = await getInvoices();

  return (
    <div>
      <Topbar title={t("title")} />
      <div className="px-4 py-4">
        <Link
          href={`/${locale}/admin/invoices/new`}
          className="flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold mb-4"
        >
          <Plus className="h-5 w-5" />
          {t("add")}
        </Link>

        {allInvoices.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {t("noInvoices")}
          </p>
        ) : (
          <div className="space-y-3">
            {allInvoices.map((inv) => (
              <InvoiceListCard key={inv.id} inv={inv} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
