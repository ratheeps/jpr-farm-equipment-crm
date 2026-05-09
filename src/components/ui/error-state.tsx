"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Could not load",
  description = "Try again or save offline.",
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <AlertTriangle
        className="h-12 w-12 text-warning"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center justify-center h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-card"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
