"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FilterPillOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterPillOption[];
  className?: string;
}

export function FilterPills({
  value,
  onChange,
  options,
  className,
}: FilterPillsProps) {
  return (
    <div
      role="group"
      className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 pb-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            data-active={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            )}
          >
            {o.label}
            {typeof o.count === "number" && (
              <>
                {" "}
                <span
                  className={cn(
                    "tnum",
                    active ? "opacity-90" : "text-muted-foreground"
                  )}
                >
                  {o.count}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
