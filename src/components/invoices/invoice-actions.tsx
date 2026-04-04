"use client";

import dynamic from "next/dynamic";
import { MessageCircle } from "lucide-react";

export interface InvoicePDFData {
  invoiceNumber: string;
  clientName: string;
  clientPhone?: string | null;
  projectName?: string | null;
  status: string;
  createdAt: string;
  paymentDueDate?: string | null;
  paidDate?: string | null;
  subtotal: string;
  discountAmount?: string | null;
  taxAmount?: string | null;
  total: string;
  notes?: string | null;
  items: {
    description: string;
    quantity: string;
    unit?: string | null;
    rate: string;
    amount: string;
  }[];
  payments?: {
    amount: string;
    paymentType: string;
    paymentDate: string;
  }[];
}

// Load the entire PDF bundle (which imports @react-pdf/renderer) client-side only
const PDFDownloadButton = dynamic(
  () => import("./invoice-pdf-client").then((m) => m.PDFDownloadButton),
  { ssr: false, loading: () => <span className="flex-1 h-11 bg-primary/40 rounded-xl" /> }
);

function buildWhatsAppMessage(data: InvoicePDFData): string {
  const parts: string[] = [
    `*Invoice ${data.invoiceNumber}*`,
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
  if (parseFloat(data.discountAmount ?? "0") > 0)
    parts.push(`Discount: - Rs.${Number(data.discountAmount).toLocaleString()}`);
  if (parseFloat(data.taxAmount ?? "0") > 0)
    parts.push(`Tax: Rs.${Number(data.taxAmount).toLocaleString()}`);
  parts.push(`*Total: Rs.${Number(data.total).toLocaleString()}*`);
  if (data.paymentDueDate) parts.push(`Due: ${data.paymentDueDate}`);
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

interface InvoiceActionsProps {
  data: InvoicePDFData;
}

export function InvoiceActions({ data }: InvoiceActionsProps) {
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
