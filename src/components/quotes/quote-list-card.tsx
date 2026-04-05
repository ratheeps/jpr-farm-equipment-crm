"use client";

import Link from "next/link";
import { FileText, Download, MoreVertical, Pencil, Trash2, MessageCircle, ArrowRight } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getQuote, deleteQuote, convertQuoteToInvoice } from "@/lib/actions/quotes";
import type { QuotePDFData } from "./quote-actions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export type QuoteSummary = {
  id: string;
  quoteNumber: string;
  clientName: string;
  total: string;
  validUntil: string | null;
  createdAt: Date;
  projectName: string | null | undefined;
};

export function QuoteListCard({
  q,
  locale,
  canDelete,
}: {
  q: QuoteSummary;
  locale: string;
  canDelete?: boolean;
}) {
  const t = useTranslations("quotes");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [converting, startConvertTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);
    try {
      const result = await getQuote(q.id);
      if (!result) return;
      const { quote, items } = result;

      const data: QuotePDFData = {
        quoteNumber: quote.quoteNumber,
        clientName: quote.clientName,
        clientPhone: quote.clientPhone,
        projectName: q.projectName ?? null,
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
      };

      const { downloadPDF } = await import("./quote-pdf-client");
      await downloadPDF(data, `${quote.quoteNumber}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  async function handleWhatsApp(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    const result = await getQuote(q.id);
    if (!result) return;
    const { quote } = result;
    const phone = quote.clientPhone?.replace(/\D/g, "") ?? "";
    const msg = encodeURIComponent(
      `Quote ${quote.quoteNumber}\nClient: ${quote.clientName}\nTotal: Rs. ${Number(quote.total).toLocaleString()}\nValid until: ${quote.validUntil ?? "—"}`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  function handleConvert() {
    startConvertTransition(async () => {
      const invoiceId = await convertQuoteToInvoice(q.id);
      router.push(`/${locale}/admin/invoices/${invoiceId}`);
    });
  }

  async function handleDeleteConfirm() {
    await deleteQuote(q.id);
    router.refresh();
  }

  return (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Link
          href={`/${locale}/admin/quotes/${q.id}`}
          className="block p-4 active:scale-98 transition-transform"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{q.quoteNumber}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {q.clientName}
                  {q.projectName ? ` · ${q.projectName}` : ""}
                </p>
              </div>
            </div>
            <span className="font-bold text-foreground shrink-0">
              Rs. {Number(q.total).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {q.validUntil
                ? `Valid until: ${q.validUntil}`
                : q.createdAt.toLocaleDateString()}
            </span>
          </div>
        </Link>

        {/* Quick action strip */}
        <div className="flex border-t border-border divide-x divide-border">
          <button
            onClick={handleConvert}
            disabled={converting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary disabled:opacity-50"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {converting ? tCommon("loading") : t("convertToInvoice")}
          </button>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-12 flex items-center justify-center py-2.5 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={handleDownload as unknown as () => void}
                disabled={downloading}
              >
                <Download className="h-4 w-4" />
                {downloading ? tCommon("loading") : "PDF"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleWhatsApp()}>
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/admin/quotes/${q.id}`}>
                  <Pencil className="h-4 w-4" />
                  {tCommon("edit")}
                </Link>
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      destructive
                      onSelect={(e) => {
                        e.preventDefault();
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {tCommon("delete")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialogContent>
        <AlertDialogTitle>{tCommon("delete")} — {q.quoteNumber}</AlertDialogTitle>
        <AlertDialogDescription>
          {tCommon("deleteConfirm")}
        </AlertDialogDescription>
        <div className="flex gap-3 mt-4">
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteConfirm}>
            {tCommon("delete")}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
