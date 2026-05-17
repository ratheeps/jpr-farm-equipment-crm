"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListRowInlineAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

interface ListRowProps {
  leadingIcon?: LucideIcon;
  leadingTone?: "primary" | "warning" | "neutral";
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  inlineAction?: ListRowInlineAction;
  onClick?: () => void;
  className?: string;
}

const toneClass: Record<NonNullable<ListRowProps["leadingTone"]>, string> = {
  primary: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  neutral: "bg-secondary text-muted-foreground",
};

// Layout: row body and inline action are siblings, NOT nested buttons.
// Nesting interactive elements is invalid HTML (a button cannot contain
// another button) and breaks keyboard a11y. The row body is a real
// <button>; the inline action is a sibling <button> positioned to the
// right of the row body. They share a flex container with shadow + bg
// so they read as one card visually.
export function ListRow({
  leadingIcon: Leading,
  leadingTone = "primary",
  title,
  subtitle,
  meta,
  inlineAction,
  onClick,
  className,
}: ListRowProps) {
  return (
    <div
      className={cn(
        "flex w-full items-stretch gap-2 rounded-lg bg-card shadow-card",
        className
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-3 text-left transition",
          "active:bg-secondary/60"
        )}
      >
        {Leading && (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              toneClass[leadingTone]
            )}
            aria-hidden
          >
            <Leading className="h-5 w-5" strokeWidth={2} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {title}
          </span>
          {subtitle && (
            <span className="block truncate text-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
        {meta && (
          <span className="ml-auto shrink-0 text-sm font-semibold tnum">{meta}</span>
        )}
      </button>
      {inlineAction && (
        <button
          type="button"
          aria-label={inlineAction.label}
          onClick={inlineAction.onClick}
          className="my-2 mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
        >
          <inlineAction.icon className="h-4 w-4" strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
}
