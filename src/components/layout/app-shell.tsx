"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Fab } from "@/components/layout/fab";
import { OfflineBanner } from "@/components/offline-banner";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import {
  FabProvider,
  useFabOverride,
} from "@/components/layout/fab-context";
import { getNavConfig, type RoleNavKey } from "@/lib/nav-config";

interface AppShellProps {
  role: RoleNavKey;
  topBar?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ role, topBar, children }: AppShellProps) {
  return (
    <FabProvider>
      <AppShellInner role={role} topBar={topBar}>
        {children}
      </AppShellInner>
    </FabProvider>
  );
}

function AppShellInner({
  role,
  topBar,
  children,
}: {
  role: RoleNavKey;
  topBar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const config = getNavConfig(role);
  const override = useFabOverride();

  // Resolution: page override (if any) wins. If the override is `{ hidden: true }`
  // or any truthy override that produced no renderable target, hide.
  // Otherwise fall back to the role's default FAB from nav-config.
  let fabNode: React.ReactNode = null;
  if (override) {
    if (!override.hidden) {
      fabNode = (
        <Fab
          label={override.label}
          icon={override.icon}
          href={override.href}
          onClick={override.onClick}
        />
      );
    }
  } else if (config.fab) {
    fabNode = (
      <Fab
        label={config.fab.labelKey}
        icon={config.fab.icon}
        href={`/${locale}${config.fab.href}`}
      />
    );
  }

  return (
    <ToastProvider swipeDirection="down">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col bg-background">
        {topBar}
        <OfflineBanner />
        <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] pt-2">
          {children}
        </main>
        {fabNode}
        <BottomNav role={role} />
        <ToastViewport />
      </div>
    </ToastProvider>
  );
}
