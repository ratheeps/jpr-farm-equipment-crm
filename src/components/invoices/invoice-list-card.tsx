"use client";

import Link from "next/link";
import { FileText, Download, CreditCard } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getInvoice, recordPayment } from "@/lib/actions/invoices";
import type { InvoicePDFData } from "./invoice-actions";

type PaymentType = "advance" | "partial" | "final";

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  total: string;
  status: string;
  paymentDueDate: string | null;
  paidDate: string | null;
  createdAt: Date;
  projectName: string | null | undefined;
};

const statusStyles: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
};

const paymentTypes: PaymentType[] = ["advance", "partial", "final"];

export function InvoiceListCard({
  inv,
  locale,
}: {
  inv: InvoiceSummary;
  locale: string;
}) {
  const t = useTranslations("invoices");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    paymentType: "partial" as PaymentType,
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);
    try {
      const result = await getInvoice(inv.id);
      if (!result) return;
      const { invoice, items, payments } = result;

      const data: InvoicePDFData = {
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientPhone: invoice.clientPhone,
        projectName: inv.projectName ?? null,
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
      };

      const { downloadPDF } = await import("./invoice-pdf-client");
      await downloadPDF(data, `${invoice.invoiceNumber}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await recordPayment(inv.id, {
        amount: form.amount,
        paymentType: form.paymentType,
        paymentDate: form.paymentDate,
        notes: form.notes || undefined,
      });
      setForm({
        amount: "",
        paymentType: "partial",
        paymentDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setPaymentOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Main card — navigates to full detail/edit page */}
      <Link
        href={`/${locale}/admin/invoices/${inv.id}`}
        className="block p-4 active:scale-98 transition-transform"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{inv.invoiceNumber}</p>
              <p className="text-xs text-muted-foreground truncate">
                {inv.clientName}
                {inv.projectName ? ` · ${inv.projectName}` : ""}
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
              statusStyles[inv.status] ?? "bg-secondary text-secondary-foreground"
            }`}
          >
            {t(`statuses.${inv.status}` as Parameters<typeof t>[0])}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {inv.paymentDueDate
              ? `${tCommon("date")}: ${inv.paymentDueDate}`
              : inv.createdAt.toLocaleDateString()}
          </span>
          <span className="font-bold text-foreground">
            Rs. {Number(inv.total).toLocaleString()}
          </span>
        </div>
      </Link>

      {/* Quick action strip */}
      <div className="flex border-t border-border divide-x divide-border">
        <button
          onClick={() => setPaymentOpen((o) => !o)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary"
        >
          <CreditCard className="h-3.5 w-3.5" />
          {t("recordPayment")}
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {downloading ? tCommon("loading") : "PDF"}
        </button>
      </div>

      {/* Inline payment form */}
      {paymentOpen && (
        <form
          onSubmit={handleSubmitPayment}
          className="border-t border-border p-4 space-y-3 bg-secondary/20"
        >
          {/* Payment type selector */}
          <div className="grid grid-cols-3 gap-1.5">
            {paymentTypes.map((pt) => (
              <button
                key={pt}
                type="button"
                onClick={() => setForm((f) => ({ ...f, paymentType: pt }))}
                className={`h-9 rounded-lg border text-xs font-medium transition-colors ${
                  form.paymentType === pt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input bg-background text-foreground"
                }`}
              >
                {t(`paymentTypes.${pt}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder={t("paymentAmount")}
              step="0.01"
              min="0.01"
              required
              inputMode="decimal"
              className="h-10 px-3 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="date"
              value={form.paymentDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, paymentDate: e.target.value }))
              }
              required
              className="h-10 px-3 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-9 bg-primary text-primary-foreground font-semibold rounded-lg text-sm disabled:opacity-60"
            >
              {saving ? tCommon("loading") : tCommon("save")}
            </button>
            <button
              type="button"
              onClick={() => setPaymentOpen(false)}
              className="flex-1 h-9 border border-input bg-background font-medium rounded-lg text-sm"
            >
              {tCommon("cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
