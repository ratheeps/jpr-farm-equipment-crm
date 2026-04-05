"use client";

import dynamic from "next/dynamic";
import { MessageCircle } from "lucide-react";

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

interface QuoteActionsProps {
  data: QuotePDFData;
}

export function QuoteActions({ data }: QuoteActionsProps) {
  const message = buildWhatsAppMessage(data);
  const encoded = encodeURIComponent(message);
  const waHref = data.clientPhone
    ? `https://wa.me/${toWhatsAppNumber(data.clientPhone)}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  return (
    <div className="flex gap-3 px-4 pb-4">
      <PDFDownloadButton data={data} />

      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-2 h-11 bg-[#25D366] text-white rounded-xl font-semibold text-sm"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </a>
    </div>
  );
}
