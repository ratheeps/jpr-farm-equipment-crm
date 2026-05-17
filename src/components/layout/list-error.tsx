"use client";

import { ErrorState } from "@/components/ui/error-state";

interface ListErrorProps {
  onRetry?: () => void;
}

export function ListError({ onRetry }: ListErrorProps) {
  return (
    <ErrorState
      title="Could not load"
      description="Try again or save offline."
      onRetry={onRetry}
    />
  );
}
