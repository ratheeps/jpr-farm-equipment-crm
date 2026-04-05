"use client";

import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { useState } from "react";
import { getQuote } from "@/lib/actions/quotes";
import type { QuotePDFData } from "./quote-actions";

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
}: {
  q: QuoteSummary;
  locale: string;
}) {
  const [downloading, setDownloading] = useState(false);

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

  return (
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
      <div className="flex border-t border-border">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {downloading ? "Preparing..." : "PDF"}
        </button>
      </div>
    </div>
  );
}
