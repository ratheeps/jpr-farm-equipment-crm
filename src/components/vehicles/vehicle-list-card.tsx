"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2, Wrench, CheckCircle, XCircle } from "lucide-react";
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
import { updateVehicleStatus, deleteVehicle } from "@/lib/actions/vehicles";

export type VehicleSummary = {
  id: string;
  name: string;
  registrationNumber: string | null;
  vehicleType: string;
  billingModel: string;
  status: "active" | "inactive" | "maintenance";
  currentEngineHours: string | null;
};

const statusOptions: {
  value: VehicleSummary["status"];
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "active",
    label: "Active",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: "bg-green-100 text-green-700",
  },
  {
    value: "inactive",
    label: "Inactive",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "bg-gray-100 text-gray-600",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    icon: <Wrench className="h-3.5 w-3.5" />,
    color: "bg-yellow-100 text-yellow-700",
  },
];

export function VehicleListCard({
  v,
  locale,
  canDelete,
}: {
  v: VehicleSummary;
  locale: string;
  canDelete: boolean;
}) {
  const t = useTranslations("vehicles");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentStatus = statusOptions.find((s) => s.value === v.status)!;

  function handleStatusChange(status: VehicleSummary["status"]) {
    if (status === v.status) return;
    startTransition(async () => {
      await updateVehicleStatus(v.id, status);
      router.refresh();
    });
  }

  async function handleDelete() {
    await deleteVehicle(v.id);
    router.refresh();
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Link
        href={`/${locale}/admin/vehicles/${v.id}`}
        className="block p-4 active:scale-98 transition-transform"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{v.name}</p>
            {v.registrationNumber && (
              <p className="text-xs text-muted-foreground">{v.registrationNumber}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
            {t(`types.${v.vehicleType}` as Parameters<typeof t>[0])}
          </span>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
            {t(`billing.${v.billingModel}` as Parameters<typeof t>[0])}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            {t("engineHours")}: {v.currentEngineHours ?? "0"}h
          </span>
        </div>
      </Link>

      {/* Quick action strip */}
      <div className="flex border-t border-border divide-x divide-border">
        {/* Status quick-change */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              disabled={isPending}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium disabled:opacity-60 ${currentStatus.color}`}
            >
              {currentStatus.icon}
              {isPending ? tCommon("loading") : t(`statuses.${v.status}` as Parameters<typeof t>[0])}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {statusOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => handleStatusChange(opt.value)}
                className={opt.value === v.status ? "opacity-50 pointer-events-none" : ""}
              >
                {opt.icon}
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More menu */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-12 flex items-center justify-center py-2.5 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/admin/vehicles/${v.id}`}>
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

          <AlertDialogContent>
            <AlertDialogTitle>{tCommon("delete")} — {v.name}</AlertDialogTitle>
            <AlertDialogDescription>
              {tCommon("deleteConfirm")}
            </AlertDialogDescription>
            <div className="flex gap-3 mt-4">
              <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                {tCommon("delete")}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
