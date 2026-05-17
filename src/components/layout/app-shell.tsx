"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Fab } from "@/components/layout/fab";
import { TopBar } from "@/components/layout/topbar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { OfflineBanner } from "@/components/offline-banner";
import { InstallPrompt, recordSession } from "@/components/install-prompt";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import {
  FabProvider,
  useFabOverride,
} from "@/components/layout/fab-context";
import {
  TopBarProvider,
  useTopBarOverride,
} from "@/components/layout/topbar-context";
import { getNavConfig, type RoleNavKey } from "@/lib/nav-config";

interface AppShellProps {
  role: RoleNavKey;
  children: React.ReactNode;
}

export function AppShell({ role, children }: AppShellProps) {
  return (
    <FabProvider>
      <TopBarProvider>
        <AppShellInner role={role}>{children}</AppShellInner>
      </TopBarProvider>
    </FabProvider>
  );
}

function AppShellInner({
  role,
  children,
}: {
  role: RoleNavKey;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const t = useTranslations("nav");
  const config = getNavConfig(role);
  const fabOverride = useFabOverride();
  const topBarOverride = useTopBarOverride();

  React.useEffect(() => {
    recordSession();
  }, []);

  let fabNode: React.ReactNode = null;
  if (fabOverride) {
    if (!fabOverride.hidden) {
      fabNode = (
        <Fab
          label={fabOverride.label}
          icon={fabOverride.icon}
          href={fabOverride.href}
          onClick={fabOverride.onClick}
        />
      );
    }
  } else if (config.fab) {
    fabNode = (
      <Fab
        label={t(config.fab.labelKey as Parameters<typeof t>[0])}
        icon={config.fab.icon}
        href={`/${locale}${config.fab.href}`}
      />
    );
  }

  const globalControls = (
    <>
      <LanguageSwitcher />
      <DarkModeToggle />
    </>
  );
  const rightSlot = topBarOverride?.right ? (
    <>
      {topBarOverride.right}
      {globalControls}
    </>
  ) : (
    globalControls
  );

  return (
    <ToastProvider swipeDirection="down">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col bg-background">
        {topBarOverride ? (
          <TopBar
            title={topBarOverride.title}
            back={topBarOverride.back}
            right={rightSlot}
          />
        ) : (
          <TopBar brand right={rightSlot} />
        )}
        <OfflineBanner />
        <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] pt-2">
          {children}
        </main>
        {fabNode}
        <BottomNav role={role} />
        <ToastViewport />
        <InstallPrompt />
      </div>
    </ToastProvider>
  );
}

function DarkModeToggle() {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-muted-foreground"
      aria-label={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
