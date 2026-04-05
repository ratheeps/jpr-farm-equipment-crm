"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generatePayrollForAll,
  finalizePayroll,
  markPayrollPaid,
} from "@/lib/actions/payroll";
import { PayrollCard } from "@/components/staff/payroll-card";

interface PayrollEntry {
  id: string;
  staffId: string;
  staffName: string | null;
  staffPayType: string | null;
  periodStart: string;
  periodEnd: string;
  totalHoursWorked: string | null;
  totalAcresWorked: string | null;
  totalKmTraveled: string | null;
  totalLogDays: number | null;
  leaveDays: number | null;
  basePay: string | null;
  performanceBonus: string | null;
  netPay: string | null;
  status: string;
}

interface PayrollManagerProps {
  initialPayroll: PayrollEntry[];
  isSuperAdmin: boolean;
  defaultPeriodStart: string;
  defaultPeriodEnd: string;
}

export function PayrollManager({
  initialPayroll,
  isSuperAdmin,
  defaultPeriodStart,
  defaultPeriodEnd,
}: PayrollManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ succeeded: number; failed: number } | null>(null);

  function handleGenerateAll() {
    setError("");
    setResult(null);
    startTransition(async () => {
      try {
        const r = await generatePayrollForAll(periodStart, periodEnd);
        setResult(r);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate payroll");
      }
    });
  }

  function handleFinalize(id: string) {
    startTransition(async () => {
      try {
        await finalizePayroll(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to finalize");
      }
    });
  }

  function handleMarkPaid(id: string) {
    startTransition(async () => {
      try {
        await markPayrollPaid(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to mark paid");
      }
    });
  }

  const totalNet = initialPayroll.reduce((s, p) => s + Number(p.netPay ?? 0), 0);

  return (
    <div className="space-y-5 pb-8">
      {/* Period selector + generate */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Generate Payroll</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Period Start
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Period End
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              min={periodStart}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && (
          <p className="text-sm text-green-600">
            Generated {result.succeeded} payrolls
            {result.failed > 0 && `, ${result.failed} failed`}
          </p>
        )}

        <button
          type="button"
          onClick={handleGenerateAll}
          disabled={!periodStart || !periodEnd || isPending}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
        >
          {isPending ? "Generating..." : "Generate for All Operators"}
        </button>
      </div>

      {/* Summary */}
      {initialPayroll.length > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Net Payroll</p>
          <p className="text-2xl font-bold text-primary">
            Rs.{totalNet.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">{initialPayroll.length} records</p>
        </div>
      )}

      {/* Payroll list */}
      {initialPayroll.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No payroll records. Generate payroll for a period above.
        </p>
      ) : (
        <div className="space-y-3">
          {initialPayroll.map((p) => (
            <PayrollCard
              key={p.id}
              {...p}
              onFinalize={handleFinalize}
              onMarkPaid={isSuperAdmin ? handleMarkPaid : undefined}
              canFinalize
              canMarkPaid={isSuperAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
