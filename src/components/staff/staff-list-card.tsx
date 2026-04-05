"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreVertical, Pencil, UserX, UserCircle, Phone } from "lucide-react";
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
import { deactivateStaff } from "@/lib/actions/staff";

export type StaffSummary = {
  userId: string;
  phone: string;
  role: string;
  fullName: string | null;
};

const roleColors: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  operator: "bg-green-100 text-green-700",
  auditor: "bg-yellow-100 text-yellow-700",
};

export function StaffListCard({
  s,
  locale,
  canDeactivate,
}: {
  s: StaffSummary;
  locale: string;
  canDeactivate: boolean;
}) {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleDeactivate() {
    await deactivateStaff(s.userId);
    router.refresh();
  }

  const displayName = s.fullName ?? s.phone;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Link
        href={`/${locale}/admin/staff/${s.userId}`}
        className="flex items-center gap-3 p-4 active:scale-98 transition-transform"
      >
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <UserCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground">{s.phone}</p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
            roleColors[s.role] ?? "bg-secondary text-secondary-foreground"
          }`}
        >
          {t(`roles.${s.role}` as Parameters<typeof t>[0])}
        </span>
      </Link>

      {/* Quick action strip */}
      <div className="flex border-t border-border divide-x divide-border">
        <a
          href={`tel:${s.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary"
        >
          <Phone className="h-3.5 w-3.5" />
          {tCommon("phone")}
        </a>

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
                <Link href={`/${locale}/admin/staff/${s.userId}`}>
                  <Pencil className="h-4 w-4" />
                  {tCommon("edit")}
                </Link>
              </DropdownMenuItem>
              {canDeactivate && (
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
                      <UserX className="h-4 w-4" />
                      {t("deactivate")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialogContent>
            <AlertDialogTitle>{t("deactivate")} — {displayName}</AlertDialogTitle>
            <AlertDialogDescription>
              {tCommon("deleteConfirm")}
            </AlertDialogDescription>
            <div className="flex gap-3 mt-4">
              <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeactivate}>
                {t("deactivate")}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
