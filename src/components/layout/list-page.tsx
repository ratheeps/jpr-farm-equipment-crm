import * as React from "react";
import { cn } from "@/lib/utils";

interface ListPageHeaderProps {
  title: string;
  count?: number;
  right?: React.ReactNode;
  children?: React.ReactNode; // optional rows below title (search, filters)
  className?: string;
}

export function ListPageHeader({
  title,
  count,
  right,
  children,
  className,
}: ListPageHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 -mx-4 mb-4 flex flex-col gap-3 bg-background/95 px-4 pb-3 pt-4 backdrop-blur",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
        {typeof count === "number" && (
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground tnum">
            {count}
          </span>
        )}
        {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
      </div>
      {children}
    </div>
  );
}
