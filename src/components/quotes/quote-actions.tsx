"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";

export interface QuotePDFData {
  quoteNumber: string;
  clientName: string;
  clientPhone?: string | null;
  projectName?: string | null;
  createdAt: string;
  validUntil?: string | null;
  subtotal: string;
  total: string;
  notes?: string | null;
  items: {
    description: string;
    quantity: string;
    unit?: string | null;
    rate: string;
    amount: string;
  }[];
}

const PDFDownloadButton = dynamic(
  () => import("./quote-pdf-client").then((m) => m.PDFDownloadButton),
  { ssr: false, loading: () => <span className="flex-1 h-11 bg-primary/40 rounded-xl" /> }
);

function buildWhatsAppMessage(data: QuotePDFData): string {
  const parts: string[] = [
    `*Quotation ${data.quoteNumber}*`,
    `Client: ${data.clientName}`,
  ];
  if (data.projectName) parts.push(`Project: ${data.projectName}`);
  parts.push("", "*Items:*");
  data.items.forEach((item) => {
    parts.push(
      `• ${item.description}: ${item.quantity}${item.unit ? " " + item.unit : ""} × Rs.${Number(item.rate).toLocaleString()} = Rs.${Number(item.amount).toLocaleString()}`
    );
  });
  parts.push("", `Subtotal: Rs.${Number(data.subtotal).toLocaleString()}`);
  parts.push(`*Total: Rs.${Number(data.total).toLocaleString()}*`);
  if (data.validUntil) parts.push(`Valid Until: ${data.validUntil}`);
  if (data.notes) parts.push(`Note: ${data.notes}`);
  return parts.join("\n");
}

function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return "94" + digits.slice(1);
  }
  return digits;
}

function ShareWhatsAppButton({ data }: { data: QuotePDFData }) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    try {
      const message = buildWhatsAppMessage(data);

      // Build PDF blob
      const { pdf } = await import("@react-pdf/renderer");
      const { QuoteDocument } = await import("./quote-pdf-client");
      const { createElement } = await import("react");
      const blob = await pdf(createElement(QuoteDocument, { data })).toBlob();
      const file = new File([blob], `${data.quoteNumber}.pdf`, { type: "application/pdf" });

      // Tier 1: Web Share API Level 2
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: message });
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
        }
      }

      // Tier 2: Upload PDF + wa.me with download link
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("invoiceId", data.quoteNumber);

        const res = await fetch("/api/invoice-pdf/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const { url } = await res.json();
          const fullMessage = `${message}\n\nDownload PDF: ${url}`;
          const waHref = data.clientPhone
            ? `https://wa.me/${toWhatsAppNumber(data.clientPhone)}?text=${encodeURIComponent(fullMessage)}`
            : `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
          window.open(waHref, "_blank");
          return;
        }
      } catch {
        // Fall through to tier 3
      }

      // Tier 3: Plain text fallback
      const waHref = data.clientPhone
        ? `https://wa.me/${toWhatsAppNumber(data.clientPhone)}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waHref, "_blank");
    } finally {
      setSharing(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className="flex-1 flex items-center justify-center gap-2 h-11 bg-[#25D366] text-white rounded-xl font-semibold text-sm disabled:opacity-60"
    >
      {sharing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      WhatsApp
    </button>
  );
}

interface QuoteActionsProps {
  data: QuotePDFData;
}

export function QuoteActions({ data }: QuoteActionsProps) {
  return (
    <div className="flex gap-3 px-4 pb-4">
      <PDFDownloadButton data={data} />
      <ShareWhatsAppButton data={data} />
    </div>
  );
}
