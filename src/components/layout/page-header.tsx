"use client";

import { useTopBar } from "./topbar-context";

interface PageHeaderProps {
  title: string;
  back?: boolean | string;
}

// Side-effect-only component: renders nothing, registers the page's title/back
// with the AppShell's TopBar via context. Server pages can render this safely
// (it's a client component) without pulling AppShell-level state into the page.
export function PageHeader({ title, back }: PageHeaderProps) {
  useTopBar({ title, back });
  return null;
}
