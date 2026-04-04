import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateInvoiceNumber } from "@/lib/actions/invoices";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("invoices");

  const [activeProjects, invoiceNumber] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.status, "active")),
    generateInvoiceNumber(),
  ]);

  return (
    <div>
      <Topbar title={t("add")} showBack />
      <div className="px-4 py-4">
        <InvoiceForm
          locale={locale}
          projects={activeProjects}
          generatedNumber={invoiceNumber}
        />
      </div>
    </div>
  );
}
