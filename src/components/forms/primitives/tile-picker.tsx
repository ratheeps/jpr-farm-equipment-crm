"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TileOption<T> {
  value: T;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
}

type TilePickerProps<T> =
  | {
      multi: true;
      value: T[];
      onChange: (value: T[]) => void;
      options: TileOption<T>[];
      className?: string;
    }
  | {
      multi?: false;
      value: T;
      onChange: (value: T) => void;
      options: TileOption<T>[];
      className?: string;
    };

export function TilePicker<T extends string | number>(
  props: TilePickerProps<T>
) {
  const { options, className } = props;
  const isSelected = (v: T) =>
    props.multi ? props.value.includes(v) : props.value === v;

  function toggle(v: T) {
    if (props.multi) {
      const arr = props.value;
      props.onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    } else {
      props.onChange(v);
    }
  }

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {options.map((o) => {
        const selected = isSelected(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            data-selected={selected}
            onClick={() => toggle(o.value)}
            className={cn(
              "flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 text-center transition",
              selected
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            )}
          >
            <o.icon className="h-7 w-7 text-foreground" strokeWidth={1.75} aria-hidden />
            <span className="text-sm font-semibold text-foreground">{o.label}</span>
            {o.subtitle && (
              <span className="text-xs text-muted-foreground">{o.subtitle}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
