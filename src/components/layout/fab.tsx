"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FabProps {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: LucideIcon;
  hidden?: boolean;
  className?: string;
}

export function Fab({ href, onClick, label, icon: Icon, hidden, className }: FabProps) {
  if (hidden) return null;
  // Bottom nav is 4rem tall plus safe-area-bottom; the FAB clears it by
  // an extra 1rem (16px) so it sits visibly above the nav, not flush
  // against the top edge. Right edge: 1rem.
  const styles = cn(
    "fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab",
    "bottom-[calc(env(safe-area-inset-bottom,0px)+5rem+1rem)]",
    className
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} className={styles}>
        <Icon className="h-6 w-6" strokeWidth={2.25} aria-hidden />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={styles}>
      <Icon className="h-6 w-6" strokeWidth={2.25} aria-hidden />
    </button>
  );
}
