"use client";

import * as React from "react";

export interface TopBarOverride {
  title: string;
  back?: boolean | string;
  right?: React.ReactNode;
}

interface Ctx {
  override: TopBarOverride | null;
  set: (next: TopBarOverride | null) => void;
}

const TopBarContext = React.createContext<Ctx | null>(null);

export function TopBarProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = React.useState<TopBarOverride | null>(null);
  const value = React.useMemo(() => ({ override, set: setOverride }), [override]);
  return <TopBarContext.Provider value={value}>{children}</TopBarContext.Provider>;
}

export function useTopBarOverride(): TopBarOverride | null {
  const ctx = React.useContext(TopBarContext);
  return ctx?.override ?? null;
}

// Per-page hook: register this page's TopBar title/back/right. Re-renders
// of the consumer would otherwise infinite-loop because setting the override
// re-renders subtree consumers; we hash the stable fields and only re-publish
// when those change. `right` is allowed to be a fresh React node each render
// — it's included by referential identity, which is acceptable since pages
// typically render the same JSX shape.
export function useTopBar(next: TopBarOverride | null): void {
  const ctx = React.useContext(TopBarContext);
  const key = stableKey(next);
  const latest = React.useRef(next);
  latest.current = next;
  const ctxRef = React.useRef(ctx);
  ctxRef.current = ctx;
  React.useEffect(() => {
    ctxRef.current?.set(latest.current);
    return () => ctxRef.current?.set(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

function stableKey(o: TopBarOverride | null): string {
  if (!o) return "";
  return [
    o.title,
    typeof o.back === "string" ? o.back : o.back ? "1" : "0",
    o.right ? "node" : "",
  ].join("|");
}
