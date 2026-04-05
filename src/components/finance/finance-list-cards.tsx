"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreVertical, Pencil, Trash2, DollarSign, TrendingDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { deleteLoan, deleteReceivable } from "@/lib/actions/finance";

const loanStatusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  defaulted: "bg-red-100 text-red-700",
};

const receivableStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  partial: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  written_off: "bg-gray-100 text-gray-700",
};

export type LoanSummary = {
  id: string;
  loanType: string;
  lenderName: string;
  vehicleName: string | null;
  status: string;
  outstandingBalance: string;
};

export type ReceivableSummary = {
  id: string;
  type: string;
  debtorName: string;
  status: string;
  dueDate: string | null;
  outstandingBalance: string;
};

export function LoanListCard({
  loan,
  locale,
  canDelete,
}: {
  loan: LoanSummary;
  locale: string;
  canDelete: boolean;
}) {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleDelete() {
    await deleteLoan(loan.id);
    router.refresh();
  }

  return (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Link
          href={`/${locale}/owner/finance/loans/${loan.id}`}
          className="block p-4 active:scale-98 transition-transform"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {loan.lenderName}
              </p>
              {loan.vehicleName && (
                <p className="text-xs text-muted-foreground truncate">
                  {loan.vehicleName}
                </p>
              )}
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                loanStatusColors[loan.status] ??
                "bg-secondary text-secondary-foreground"
              }`}
            >
              {t(`loanStatuses.${loan.status}` as Parameters<typeof t>[0])}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {t(`loanTypes.${loan.loanType}` as Parameters<typeof t>[0])}
            </span>
            <span className="text-xs font-medium text-destructive ml-auto">
              {t("outstanding")}: Rs. {Number(loan.outstandingBalance).toLocaleString()}
            </span>
          </div>
        </Link>

        {/* Action strip */}
        <div className="flex border-t border-border divide-x divide-border">
          <Link
            href={`/${locale}/owner/finance/loans/${loan.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary"
          >
            <TrendingDown className="h-3.5 w-3.5" />
            {t("recordPayment")}
          </Link>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className="w-12 flex items-center justify-center py-2.5 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/owner/finance/loans/${loan.id}`}>
                  <Pencil className="h-4 w-4" />
                  {tCommon("edit")}
                </Link>
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      destructive
                      onSelect={(e) => {
                        e.preventDefault();
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {tCommon("delete")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialogContent>
        <AlertDialogTitle>{tCommon("delete")} — {loan.lenderName}</AlertDialogTitle>
        <AlertDialogDescription>{tCommon("deleteConfirm")}</AlertDialogDescription>
        <div className="flex gap-3 mt-4">
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>{tCommon("delete")}</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ReceivableListCard({
  rec,
  locale,
  canDelete,
}: {
  rec: ReceivableSummary;
  locale: string;
  canDelete: boolean;
}) {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleDelete() {
    await deleteReceivable(rec.id);
    router.refresh();
  }

  return (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Link
          href={`/${locale}/owner/finance/receivables/${rec.id}`}
          className="block p-4 active:scale-98 transition-transform"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {rec.debtorName}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(`receivableTypes.${rec.type}` as Parameters<typeof t>[0])}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                receivableStatusColors[rec.status] ??
                "bg-secondary text-secondary-foreground"
              }`}
            >
              {t(`receivableStatuses.${rec.status}` as Parameters<typeof t>[0])}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {rec.dueDate && (
              <span className="text-xs text-muted-foreground">Due: {rec.dueDate}</span>
            )}
            <span className="text-xs font-medium text-green-600 ml-auto">
              {t("outstanding")}: Rs. {Number(rec.outstandingBalance).toLocaleString()}
            </span>
          </div>
        </Link>

        {/* Action strip */}
        <div className="flex border-t border-border divide-x divide-border">
          <Link
            href={`/${locale}/owner/finance/receivables/${rec.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary"
          >
            <DollarSign className="h-3.5 w-3.5" />
            {t("recordPayment")}
          </Link>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className="w-12 flex items-center justify-center py-2.5 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/owner/finance/receivables/${rec.id}`}>
                  <Pencil className="h-4 w-4" />
                  {tCommon("edit")}
                </Link>
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      destructive
                      onSelect={(e) => {
                        e.preventDefault();
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {tCommon("delete")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialogContent>
        <AlertDialogTitle>{tCommon("delete")} — {rec.debtorName}</AlertDialogTitle>
        <AlertDialogDescription>{tCommon("deleteConfirm")}</AlertDialogDescription>
        <div className="flex gap-3 mt-4">
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>{tCommon("delete")}</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
