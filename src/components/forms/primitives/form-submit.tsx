"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pending?: boolean;
  variant?: "primary" | "secondary";
}

export function FormSubmit({
  pending,
  disabled,
  className,
  children,
  variant = "primary",
  ...rest
}: FormSubmitProps) {
  const palette =
    variant === "primary"
      ? "bg-primary text-primary-foreground"
      : "bg-secondary text-foreground";
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-semibold shadow-card",
        palette,
        "disabled:opacity-60",
        className
      )}
      {...rest}
    >
      {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
