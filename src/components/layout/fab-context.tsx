"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

export interface FabOverride {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  hidden?: boolean;
}

interface Ctx {
  override: FabOverride | null;
  set: (next: FabOverride | null) => void;
}

const FabContext = React.createContext<Ctx | null>(null);

export function FabProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = React.useState<FabOverride | null>(null);
  const value = React.useMemo(() => ({ override, set: setOverride }), [override]);
  return <FabContext.Provider value={value}>{children}</FabContext.Provider>;
}

export function useFabOverride(): FabOverride | null {
  const ctx = React.useContext(FabContext);
  return ctx?.override ?? null;
}

// Per-page hook: page calls this with its desired FAB; shell renders it.
// Pass `null` to hide the FAB on this page; omit the call to keep the
// role's default FAB.
//
// Callers may pass fresh object literals each render. We hash the
// meaningful fields and only re-publish when they change; raw reference
// inequality would otherwise infinite-loop because the page is a context
// consumer that re-renders when the override is set.
export function useFab(next: FabOverride | null): void {
  const ctx = React.useContext(FabContext);
  const key = stableKey(next);
  const latest = React.useRef(next);
  latest.current = next;
  React.useEffect(() => {
    if (!ctx) return;
    ctx.set(latest.current);
    return () => ctx.set(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, key]);
}

function stableKey(o: FabOverride | null): string {
  if (!o) return "";
  return [
    o.label,
    o.icon?.displayName ?? o.icon?.name ?? "",
    o.href ?? "",
    o.onClick ? "fn" : "",
    o.hidden ? "1" : "0",
  ].join("|");
}
