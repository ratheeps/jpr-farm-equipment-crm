"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
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
import { updateProjectStatus, deleteProject } from "@/lib/actions/projects";

export type ProjectSummary = {
  id: string;
  name: string;
  clientName: string;
  status: "planned" | "active" | "completed" | "invoiced";
  startDate: string | null;
  endDate: string | null;
  estimatedCost: string | null;
};

const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  invoiced: "bg-purple-100 text-purple-700",
};

const statusOptions: ProjectSummary["status"][] = [
  "planned",
  "active",
  "completed",
  "invoiced",
];

export function ProjectListCard({
  p,
  locale,
  canDelete,
}: {
  p: ProjectSummary;
  locale: string;
  canDelete: boolean;
}) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleStatusChange(status: ProjectSummary["status"]) {
    if (status === p.status) return;
    startTransition(async () => {
      await updateProjectStatus(p.id, status);
      router.refresh();
    });
  }

  async function handleDelete() {
    await deleteProject(p.id);
    router.refresh();
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Link
        href={`/${locale}/admin/projects/${p.id}`}
        className="block p-4 active:scale-98 transition-transform"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{p.name}</p>
            <p className="text-sm text-muted-foreground truncate">{p.clientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {(p.startDate || p.endDate) && (
            <span className="text-xs text-muted-foreground">
              {p.startDate ?? "—"} → {p.endDate ?? "—"}
            </span>
          )}
          {p.estimatedCost && (
            <span className="text-xs text-muted-foreground ml-auto">
              Rs. {Number(p.estimatedCost).toLocaleString()}
            </span>
          )}
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
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-none disabled:opacity-60 ${
                statusColors[p.status] ?? "bg-secondary text-secondary-foreground"
              }`}
            >
              {isPending
                ? tCommon("loading")
                : t(`statuses.${p.status}` as Parameters<typeof t>[0])}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {statusOptions.map((status) => (
              <DropdownMenuItem
                key={status}
                onSelect={() => handleStatusChange(status)}
                className={status === p.status ? "opacity-50 pointer-events-none" : ""}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-1 ${
                    statusColors[status]?.replace("text-", "bg-").split(" ")[0] ?? ""
                  }`}
                />
                {t(`statuses.${status}` as Parameters<typeof t>[0])}
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
                <Link href={`/${locale}/admin/projects/${p.id}`}>
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
            <AlertDialogTitle>{tCommon("delete")} — {p.name}</AlertDialogTitle>
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
