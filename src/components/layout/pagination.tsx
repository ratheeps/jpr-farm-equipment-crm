import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <span className="text-xs text-muted-foreground">
        Page {page + 1} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 0 ? (
          <Link
            href={href(page - 1)}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground active:scale-95 transition-transform"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground/40">
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        {page < totalPages - 1 ? (
          <Link
            href={href(page + 1)}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground active:scale-95 transition-transform"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground/40">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
