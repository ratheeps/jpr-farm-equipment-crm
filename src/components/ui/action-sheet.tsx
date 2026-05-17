"use client";

import * as React from "react";
import { Drawer } from "vaul";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionSheetItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actions: ActionSheetItem[];
}

export function ActionSheet({
  open,
  onOpenChange,
  title,
  description,
  actions,
}: ActionSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex flex-col rounded-t-2xl bg-card pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-sheet">
          <div className="mx-auto mt-2 mb-3 h-1.5 w-10 rounded-full bg-muted" />
          {title && (
            <div className="px-4 pb-3">
              <Drawer.Title className="text-base font-semibold">{title}</Drawer.Title>
              {description && (
                <Drawer.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </Drawer.Description>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 px-4">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                disabled={a.disabled}
                onClick={() => {
                  a.onClick();
                  onOpenChange(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg p-4 text-sm font-semibold transition",
                  a.destructive
                    ? "bg-destructive/10 text-destructive"
                    : "bg-secondary text-foreground",
                  "disabled:opacity-50"
                )}
              >
                <a.icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                {a.label}
              </button>
            ))}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
