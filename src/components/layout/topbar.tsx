"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  back?: boolean | string;
  right?: React.ReactNode;
  brand?: boolean;
  className?: string;
}

export function TopBar({
  title,
  back,
  right,
  brand = false,
  className,
}: TopBarProps) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-2 bg-background/95 px-3 pt-safe backdrop-blur",
        className
      )}
    >
      {back ? (
        typeof back === "string" ? (
          <Link
            href={back}
            aria-label="Back"
            className="flex h-11 w-11 items-center justify-center rounded-md text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex h-11 w-11 items-center justify-center rounded-md text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )
      ) : null}
      {brand ? (
        <span className="text-base font-extrabold tracking-tight">JPR Farm</span>
      ) : title ? (
        <h1 className="truncate text-base font-semibold">{title}</h1>
      ) : null}
      {right && <div className="ml-auto flex items-center gap-1">{right}</div>}
    </header>
  );
}
