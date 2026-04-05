"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { convertQuoteToInvoice } from "@/lib/actions/quotes";
import { ArrowRight } from "lucide-react";

interface Props {
  quoteId: string;
  locale: string;
}

export function ConvertToInvoiceButton({ quoteId, locale }: Props) {
  const t = useTranslations("quotes");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleConvert() {
    setLoading(true);
    try {
      const invoiceId = await convertQuoteToInvoice(quoteId);
      router.push(`/${locale}/admin/invoices/${invoiceId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleConvert}
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full h-11 border border-primary text-primary rounded-xl text-sm font-semibold disabled:opacity-60"
    >
      <ArrowRight className="h-4 w-4" />
      {loading ? t("converting") : t("convertToInvoice")}
    </button>
  );
}
