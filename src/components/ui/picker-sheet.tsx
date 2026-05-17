"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PickerOption<T = string> {
  value: T;
  label: string;
  subtitle?: string;
}

interface PickerSheetProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: PickerOption<T>[];
  value?: T;
  onSelect: (value: T) => void;
  searchPlaceholder?: string;
}

export function PickerSheet<T extends string | number>({
  open,
  onOpenChange,
  title,
  options,
  value,
  onSelect,
  searchPlaceholder = "Search…",
}: PickerSheetProps<T>) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex max-h-[80vh] flex-col rounded-t-2xl bg-card shadow-sheet">
          <div className="mx-auto mt-2 mb-3 h-1.5 w-10 rounded-full bg-muted" />
          <div className="px-4 pb-3">
            <Drawer.Title className="text-base font-semibold">{title}</Drawer.Title>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-11 w-full rounded-lg bg-secondary pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="overflow-y-auto px-2 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
            {filtered.map((o) => {
              const selected = o.value === value;
              return (
                <button
                  key={String(o.value)}
                  type="button"
                  onClick={() => {
                    onSelect(o.value);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left",
                    selected && "bg-primary/10"
                  )}
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">{o.label}</div>
                    {o.subtitle && (
                      <div className="text-xs text-muted-foreground">{o.subtitle}</div>
                    )}
                  </div>
                  {selected && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
