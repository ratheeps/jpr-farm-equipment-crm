"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { recordPayment, deletePayment } from "@/lib/actions/invoices";

type PaymentType = "advance" | "partial" | "final";

interface Payment {
  id: string;
  amount: string;
  paymentType: string;
  paymentDate: string;
  notes: string | null;
}

interface InvoicePaymentsProps {
  invoiceId: string;
  invoiceTotal: string;
  payments: Payment[];
}

export function InvoicePayments({
  invoiceId,
  invoiceTotal,
  payments,
}: InvoicePaymentsProps) {
  const t = useTranslations("invoices");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    paymentType: "partial" as PaymentType,
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const balance = Math.max(0, parseFloat(invoiceTotal) - totalPaid);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await recordPayment(invoiceId, {
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
      setShowForm(false);
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(paymentId: string) {
    if (!confirm(tCommon("confirm"))) return;
    await deletePayment(paymentId, invoiceId);
    router.refresh();
  }

  const paymentTypes: PaymentType[] = ["advance", "partial", "final"];

  const typeColors: Record<string, string> = {
    advance: "bg-blue-100 text-blue-700",
    partial: "bg-yellow-100 text-yellow-700",
    final: "bg-green-100 text-green-700",
  };

  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-foreground">{t("payments")}</p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-sm text-primary font-medium"
          >
            <Plus className="h-4 w-4" />
            {t("recordPayment")}
          </button>
        )}
      </div>

      {/* Payment summary bar */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("totalPaid")}</span>
          <span className="font-semibold text-green-600">
            Rs. {totalPaid.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("balanceDue")}</span>
          <span className={`font-bold ${balance > 0 ? "text-destructive" : "text-green-600"}`}>
            Rs. {balance.toLocaleString()}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{
              width: `${Math.min(100, (totalPaid / parseFloat(invoiceTotal)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Record payment form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-secondary/40 border border-border rounded-xl p-4 space-y-3"
        >
          {/* Payment type */}
          <div className="grid grid-cols-3 gap-2">
            {paymentTypes.map((pt) => (
              <button
                key={pt}
                type="button"
                onClick={() => set("paymentType", pt)}
                className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                  form.paymentType === pt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input bg-background text-foreground"
                }`}
              >
                {t(`paymentTypes.${pt}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              {t("paymentAmount")}
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
              inputMode="decimal"
              className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            />
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              {t("paymentDate")}
            </label>
            <input
              type="date"
              value={form.paymentDate}
              onChange={(e) => set("paymentDate", e.target.value)}
              required
              className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              {tCommon("notes")}
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional"
              className="w-full h-12 px-4 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 bg-primary text-primary-foreground font-semibold rounded-xl text-sm disabled:opacity-60"
            >
              {loading ? tCommon("loading") : tCommon("save")}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 h-11 border border-input bg-background text-foreground font-semibold rounded-xl text-sm"
            >
              {tCommon("cancel")}
            </button>
          </div>
        </form>
      )}

      {/* Payments list */}
      {payments.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("noPayments")}
        </p>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[p.paymentType] ?? "bg-secondary text-secondary-foreground"}`}
                >
                  {t(`paymentTypes.${p.paymentType}` as Parameters<typeof t>[0])}
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    Rs. {Number(p.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.paymentDate}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
