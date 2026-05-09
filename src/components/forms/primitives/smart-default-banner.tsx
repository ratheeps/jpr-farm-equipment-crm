"use client";

import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartDefaultBannerProps {
  summary: string;
  onContinue: () => void;
  onChange: () => void;
  className?: string;
}

export function SmartDefaultBanner({
  summary,
  onContinue,
  onChange,
  className,
}: SmartDefaultBannerProps) {
  return (
    <div className={cn("rounded-lg border border-dashed border-warning/60 bg-warning/10 p-3", className)}>
      <div className="flex items-start gap-2">
        <Pin className="mt-0.5 h-4 w-4 text-warning" aria-hidden />
        <div>
          <p className="text-xs text-warning-foreground/80">Continue from yesterday?</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{summary}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
        >
          Yes, continue
        </button>
        <button
          type="button"
          onClick={onChange}
          className="h-10 rounded-md bg-secondary text-foreground text-sm font-semibold"
        >
          Change
        </button>
      </div>
    </div>
  );
}
