"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { getNavConfig, type NavTab, type RoleNavKey } from "@/lib/nav-config";
import { SlidingMenu } from "@/components/layout/sliding-menu";

interface BottomNavProps {
  role: RoleNavKey;
}

function isTabActive(tab: NavTab, locale: string, pathname: string): boolean {
  if (tab.kind !== "link") return false;
  const fullHref = `/${locale}${tab.href}`;
  const isRoleRoot = tab.href.split("/").filter(Boolean).length === 1;
  if (isRoleRoot) return pathname === fullHref;
  return pathname === fullHref || pathname.startsWith(`${fullHref}/`);
}

export function BottomNav({ role }: BottomNavProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { tabs } = getNavConfig(role);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <SlidingMenu open={menuOpen} onClose={() => setMenuOpen(false)} role={role} />
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 pb-safe backdrop-blur"
      >
        <ul
          className="grid h-16"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            const label = t(tab.labelKey as Parameters<typeof t>[0]);
            const className = cn(
              "flex flex-col items-center justify-center gap-1 text-[10px] font-semibold",
              menuOpen && tab.kind === "action"
                ? "text-primary"
                : tab.kind === "link" && isTabActive(tab, locale, pathname)
                ? "text-primary"
                : "text-muted-foreground"
            );

            if (tab.kind === "action") {
              const active = menuOpen;
              return (
                <li key={`action-${i}`} className="contents">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label={label}
                    aria-expanded={menuOpen}
                    className={className}
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={active ? 2.5 : 2}
                      aria-hidden
                    />
                    <span>{label}</span>
                  </button>
                </li>
              );
            }

            const href = `/${locale}${tab.href}`;
            const active = isTabActive(tab, locale, pathname);
            return (
              <li key={tab.href} className="contents">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={className}
                >
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={active ? 2.5 : 2}
                    aria-hidden
                  />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
