"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...rest }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-20 left-0 right-0 z-[60] flex flex-col gap-2 px-4 outline-none",
      className
    )}
    {...rest}
  />
));
ToastViewport.displayName = "ToastViewport";

type ToastVariant = "success" | "info" | "error";

interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: ToastVariant;
}

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastProps
>(({ variant = "info", className, children, ...rest }, ref) => {
  const Icon =
    variant === "success" ? CheckCircle2 : variant === "error" ? AlertCircle : Info;
  const accent =
    variant === "success"
      ? "text-success"
      : variant === "error"
      ? "text-destructive"
      : "text-info";
  return (
    <ToastPrimitive.Root
      ref={ref}
      duration={2500}
      className={cn(
        "flex items-start gap-3 rounded-lg bg-foreground/95 px-4 py-3 text-background shadow-card",
        className
      )}
      {...rest}
    >
      <Icon className={cn("h-5 w-5 shrink-0", accent)} aria-hidden />
      <div className="flex-1 text-sm">{children}</div>
    </ToastPrimitive.Root>
  );
});
Toast.displayName = "Toast";

export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
export const ToastAction = ToastPrimitive.Action;
export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>((props, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    aria-label="Close"
    className="rounded-md p-1 text-background/70 hover:text-background"
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = "ToastClose";
