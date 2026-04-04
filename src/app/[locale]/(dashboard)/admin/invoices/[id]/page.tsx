import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { InvoicePayments } from "@/components/invoices/invoice-payments";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getInvoice } from "@/lib/actions/invoices";
import { notFound } from "next/navigation";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("invoices");

  const [result, activeProjects] = await Promise.all([
    getInvoice(id),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.status, "active")),
  ]);

  if (!result) notFound();

  const { invoice, items, payments } = result;

  // Find project name for the PDF/WhatsApp
  const projectName =
    activeProjects.find((p) => p.id === invoice.projectId)?.name ?? null;

  return (
    <div>
      <Topbar title={t("edit")} showBack />

      {/* PDF + WhatsApp action buttons */}
      <InvoiceActions
        data={{
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientName,
          clientPhone: invoice.clientPhone,
          projectName,
          status: invoice.status,
          createdAt: invoice.createdAt.toLocaleDateString("en-LK"),
          paymentDueDate: invoice.paymentDueDate,
          paidDate: invoice.paidDate,
          subtotal: invoice.subtotal,
          discountAmount: invoice.discountAmount,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          notes: invoice.notes,
          payments: payments.map((p) => ({
            amount: p.amount,
            paymentType: p.paymentType,
            paymentDate: p.paymentDate ?? "",
          })),
          items: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            amount: item.amount,
          })),
        }}
      />

      {/* Payments section */}
      <InvoicePayments
        invoiceId={invoice.id}
        invoiceTotal={invoice.total}
        payments={payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentType: p.paymentType,
          paymentDate: p.paymentDate ?? "",
          notes: p.notes,
        }))}
      />

      <div className="px-4 pb-4">
        <InvoiceForm
          locale={locale}
          projects={activeProjects}
          initial={{
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            projectId: invoice.projectId,
            clientName: invoice.clientName,
            clientPhone: invoice.clientPhone,
            subtotal: invoice.subtotal,
            discountAmount: invoice.discountAmount,
            taxAmount: invoice.taxAmount,
            total: invoice.total,
            status: invoice.status as "draft" | "sent" | "paid" | "overdue" | "cancelled",
            paymentDueDate: invoice.paymentDueDate,
            paidDate: invoice.paidDate,
            notes: invoice.notes,
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
