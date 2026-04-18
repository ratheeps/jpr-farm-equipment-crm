import { ClipboardList, CheckCircle, Clock } from "lucide-react";

interface PayrollCardProps {
  id: string;
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
  perUnitBonusTotal?: string | null;
  tripAllowanceTotal?: string | null;
  netPay: string | null;
  status: string;
  onFinalize?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
  canFinalize?: boolean;
  canMarkPaid?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; Icon: React.ElementType }> =
  {
    draft: { label: "Draft", className: "bg-amber-100 text-amber-700", Icon: ClipboardList },
    finalized: { label: "Finalized", className: "bg-blue-100 text-blue-700", Icon: CheckCircle },
    paid: { label: "Paid", className: "bg-green-100 text-green-700", Icon: CheckCircle },
  };

const PAY_TYPE_LABEL: Record<string, string> = {
  hourly: "hrs",
  daily: "days",
  monthly: "flat",
  per_acre: "acres",
};

export function PayrollCard({
  id,
  staffName,
  staffPayType,
  periodStart,
  periodEnd,
  totalHoursWorked,
  totalAcresWorked,
  totalKmTraveled,
  totalLogDays,
  leaveDays,
  basePay,
  performanceBonus,
  perUnitBonusTotal,
  tripAllowanceTotal,
  netPay,
  status,
  onFinalize,
  onMarkPaid,
  canFinalize,
  canMarkPaid,
}: PayrollCardProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const StatusIcon = cfg.Icon;

  const hours = Number(totalHoursWorked ?? 0).toFixed(1);
  const acres = Number(totalAcresWorked ?? 0).toFixed(1);
  const km = Number(totalKmTraveled ?? 0).toFixed(0);
  const base = Number(basePay ?? 0);
  const bonus = Number(performanceBonus ?? 0);
  const net = Number(netPay ?? 0);

  return (
    <div className="rounded-2xl bg-card border border-border px-4 py-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-foreground">{staffName}</p>
          <p className="text-xs text-muted-foreground">
            {periodStart} → {periodEnd}
          </p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
          <StatusIcon className="h-3 w-3" />
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{hours}</p>
          <p className="text-xs text-muted-foreground">Hours</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{totalLogDays ?? 0}</p>
          <p className="text-xs text-muted-foreground">Work Days</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{leaveDays ?? 0}</p>
          <p className="text-xs text-muted-foreground">Leave Days</p>
        </div>
      </div>

      <div className="border-t border-border pt-3 space-y-1">
        {base > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base Pay</span>
            <span className="font-medium text-foreground">Rs.{base.toLocaleString()}</span>
          </div>
        )}
        {bonus > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Performance Bonus</span>
            <span className="font-medium text-green-600">+Rs.{bonus.toLocaleString()}</span>
          </div>
        )}
        {Number(perUnitBonusTotal ?? 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Per-Unit Bonus</span>
            <span className="font-medium text-green-600">+Rs.{Number(perUnitBonusTotal).toLocaleString()}</span>
          </div>
        )}
        {Number(tripAllowanceTotal ?? 0) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trip Allowance</span>
            <span className="font-medium text-green-600">+Rs.{Number(tripAllowanceTotal).toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold">
          <span className="text-foreground">Net Pay</span>
          <span className="text-primary">Rs.{net.toLocaleString()}</span>
        </div>
      </div>

      {(canFinalize || canMarkPaid) && (
        <div className="flex gap-2 mt-3">
          {canFinalize && status === "draft" && onFinalize && (
            <button
              type="button"
              onClick={() => onFinalize(id)}
              className="flex-1 h-9 rounded-xl border border-primary text-primary text-sm font-semibold"
            >
              Finalize
            </button>
          )}
          {canMarkPaid && status === "finalized" && onMarkPaid && (
            <button
              type="button"
              onClick={() => onMarkPaid(id)}
              className="flex-1 h-9 rounded-xl bg-green-600 text-white text-sm font-semibold"
            >
              Mark Paid
            </button>
          )}
        </div>
      )}
    </div>
  );
}
