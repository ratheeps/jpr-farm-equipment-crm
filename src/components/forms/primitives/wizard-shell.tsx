"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface WizardShellProps {
  children: React.ReactNode;
  initialStep?: number;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  nextLabel?: string;
  backLabel?: string;
  canAdvance?: (step: number) => boolean;
  className?: string;
}

export function WizardShell({
  children,
  initialStep = 0,
  onSubmit,
  isSubmitting,
  submitLabel = "Save",
  nextLabel = "Next",
  backLabel = "Back",
  canAdvance,
  className,
}: WizardShellProps) {
  const steps = React.Children.toArray(children);
  const total = steps.length;
  const [step, setStep] = React.useState(Math.max(0, Math.min(initialStep, total - 1)));
  const isLast = step === total - 1;
  const blocked = canAdvance ? !canAdvance(step) : false;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i <= step ? "bg-primary" : "bg-secondary"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Step {step + 1} of {total}
      </p>
      <div>{steps[step]}</div>
      <div className="grid grid-cols-3 gap-2 pt-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || isSubmitting}
          className="col-span-1 h-12 rounded-lg bg-secondary text-foreground text-sm font-semibold disabled:opacity-40"
        >
          {backLabel}
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={blocked || isSubmitting}
            className="col-span-2 h-12 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            disabled={blocked}
            className="col-span-2 h-12 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
