"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { generateFromProject } from "@/lib/actions/invoice-generation";

interface GenerateInvoiceButtonProps {
  projectId: string;
  locale: string;
  disabled?: boolean;
}

export function GenerateInvoiceButton({ projectId, locale, disabled }: GenerateInvoiceButtonProps) {
  const t = useTranslations("invoices");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function handleClick() {
    setError("");
    startTransition(async () => {
      try {
        const invoiceId = await generateFromProject(projectId);
        router.push(`/${locale}/admin/invoices/${invoiceId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate invoice");
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
      >
        {isPending ? "..." : t("generateInvoiceFromLogs")}
      </button>
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
