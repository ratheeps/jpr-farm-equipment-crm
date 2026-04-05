"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreVertical, Pencil, Trash2, Wheat } from "lucide-react";
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
import { deleteFarm } from "@/lib/actions/farms";

export type FarmSummary = {
  id: string;
  name: string;
  locationText: string | null;
  areaAcres: string | null;
  isActive: boolean;
  cycleCount: number;
};

export function FarmListCard({
  farm,
  locale,
  canDelete,
}: {
  farm: FarmSummary;
  locale: string;
  canDelete: boolean;
}) {
  const t = useTranslations("farms");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleDelete() {
    await deleteFarm(farm.id);
    router.refresh();
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Link
        href={`/${locale}/admin/farms/${farm.id}`}
        className="block p-4 active:scale-98 transition-transform"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{farm.name}</p>
            {farm.locationText && (
              <p className="text-sm text-muted-foreground truncate">
                {farm.locationText}
              </p>
            )}
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
              farm.isActive
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {farm.isActive ? tCommon("active") : tCommon("inactive")}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          {farm.areaAcres && (
            <span className="text-xs text-muted-foreground">
              {farm.areaAcres} ac
            </span>
          )}
          {farm.cycleCount > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {farm.cycleCount} {t("cycles").toLowerCase()}
            </span>
          )}
        </div>
      </Link>

      {/* Quick action strip */}
      <div className="flex border-t border-border divide-x divide-border">
        <Link
          href={`/${locale}/admin/farms/${farm.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary"
        >
          <Wheat className="h-3.5 w-3.5" />
          {t("cycles")}
        </Link>

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
                <Link href={`/${locale}/admin/farms/${farm.id}`}>
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
            <AlertDialogTitle>{tCommon("delete")} — {farm.name}</AlertDialogTitle>
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
