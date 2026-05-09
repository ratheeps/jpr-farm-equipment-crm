import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  totalPages: number;
  basePath: string;
  query?: string;
}

export function Pagination({ page, totalPages, basePath, query }: Props) {
  if (totalPages <= 1) return null;

  function href(p: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 0) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const baseBtn =
    "h-9 w-9 min-w-9 flex items-center justify-center rounded-md bg-secondary text-foreground transition";
  const disabled = "opacity-50 pointer-events-none";

  return (
    <nav className="mt-4 flex items-center justify-between gap-2 px-1" aria-label="Pagination">
      <span className="text-xs text-muted-foreground tnum">
        Page {page + 1} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 0 ? (
          <Link href={href(page - 1)} className={cn(baseBtn, "active:bg-secondary/80")} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className={cn(baseBtn, disabled)} aria-hidden>
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        {page < totalPages - 1 ? (
          <Link href={href(page + 1)} className={cn(baseBtn, "active:bg-secondary/80")} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={cn(baseBtn, disabled)} aria-hidden>
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
