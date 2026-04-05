"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { recordLoanPayment, deleteLoanPayment } from "@/lib/actions/finance";
import { Plus, Trash2 } from "lucide-react";

interface LoanPayment {
  id: string;
  amount: string;
  principalPortion: string | null;
  interestPortion: string | null;
  paymentDate: string;
  paymentMethod: string | null;
  referenceNumber: string | null;
  notes: string | null;
}

interface LoanPaymentsProps {
  loanId: string;
  payments: LoanPayment[];
  outstandingBalance: string;
  emiAmount?: string | null;
  readonly?: boolean;
}

export function LoanPayments({
  loanId,
  payments,
  outstandingBalance,
  emiAmount,
  readonly = false,
}: LoanPaymentsProps) {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [amount, setAmount] = useState(emiAmount ?? "");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [principalPortion, setPrincipalPortion] = useState("");
  const [interestPortion, setInterestPortion] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const totalPaid = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0
  );
  const outstanding = parseFloat(outstandingBalance);

  function resetForm() {
    setShowForm(false);
    setAmount(emiAmount ?? "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPrincipalPortion("");
    setInterestPortion("");
    setPaymentMethod("");
    setReferenceNumber("");
    setNotes("");
  }

  async function handleAdd() {
    if (!amount || !paymentDate) return;
    setLoading(true);
    try {
      await recordLoanPayment(loanId, {
        amount,
        paymentDate,
        principalPortion: principalPortion || undefined,
        interestPortion: interestPortion || undefined,
        paymentMethod: paymentMethod || undefined,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      });
      resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(tCommon("confirm"))) return;
    setDeleting(id);
    try {
      await deleteLoanPayment(id, loanId);
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mt-6 pb-8">
      <h2 className="text-base font-semibold text-foreground mb-3">
        {t("loans")} — {t("recordPayment")}
      </h2>

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("totalPaid")}
            </p>
            <p className="text-sm font-semibold text-green-600">
              Rs. {totalPaid.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("outstandingBalance")}
            </p>
            <p className="text-sm font-semibold text-red-600">
              Rs. {outstanding.toLocaleString()}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        {totalPaid + outstanding > 0 && (
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (totalPaid / (totalPaid + outstanding)) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Payment list */}
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("noLoans")}
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Rs. {Number(p.amount).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.paymentDate}
                  {p.paymentMethod && ` · ${p.paymentMethod}`}
                  {p.referenceNumber && ` · #${p.referenceNumber}`}
                </p>
              </div>
              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={deleting === p.id}
                  className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {!readonly && (
        <>
          {showForm ? (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs text-muted-foreground">
                    {tCommon("amount")}
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    step="0.01"
                    inputMode="decimal"
                    className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-muted-foreground">
                    {t("transactionDate")}
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={principalPortion}
                  onChange={(e) => setPrincipalPortion(e.target.value)}
                  placeholder={t("principalPortion")}
                  step="0.01"
                  inputMode="decimal"
                  className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
                <input
                  type="number"
                  value={interestPortion}
                  onChange={(e) => setInterestPortion(e.target.value)}
                  placeholder={t("interestPortion")}
                  step="0.01"
                  inputMode="decimal"
                  className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder={t("paymentMethod")}
                  className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={t("referenceNumber")}
                  className="h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>

              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={tCommon("notes")}
                className="w-full h-10 px-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 h-10 border border-input rounded-lg text-sm font-medium text-foreground bg-background"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={loading || !amount || !paymentDate}
                  className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {loading ? tCommon("loading") : tCommon("save")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 w-full h-11 border border-input rounded-xl text-sm font-medium text-foreground bg-background"
            >
              <Plus className="h-4 w-4" />
              {t("recordPayment")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
