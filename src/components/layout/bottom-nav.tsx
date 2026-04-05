"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  Wallet,
  FolderKanban,
  MoreHorizontal,
  ClipboardList,
  Receipt,
  Clock,
  FileBarChart,
  ArrowLeftRight,
  Wheat,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ElementType;
};

const ownerNavItems: NavItem[] = [
  { href: "/owner", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/admin/projects", labelKey: "projects", icon: FolderKanban },
  { href: "/admin/invoices", labelKey: "invoices", icon: Receipt },
  { href: "/admin/farms", labelKey: "farms", icon: Wheat },
  { href: "/owner/finance", labelKey: "finance", icon: Wallet },
];

const adminNavItems: NavItem[] = [
  { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/admin/projects", labelKey: "projects", icon: FolderKanban },
  { href: "/admin/invoices", labelKey: "invoices", icon: Receipt },
  { href: "/admin/staff", labelKey: "staff", icon: ClipboardList },
  { href: "/admin/more", labelKey: "more", icon: MoreHorizontal },
];

const operatorNavItems: NavItem[] = [
  { href: "/operator", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/operator/log", labelKey: "logWork", icon: Clock },
  { href: "/operator/expenses", labelKey: "expenses", icon: Receipt },
  { href: "/operator/history", labelKey: "history", icon: ClipboardList },
];

const auditorNavItems: NavItem[] = [
  { href: "/auditor", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/auditor/reports", labelKey: "reports", icon: FileBarChart },
  { href: "/auditor/transactions", labelKey: "transactions", icon: ArrowLeftRight },
  { href: "/auditor/export", labelKey: "export", icon: Receipt },
];

const roleNavMap: Record<string, NavItem[]> = {
  owner: ownerNavItems,
  admin: adminNavItems,
  operator: operatorNavItems,
  auditor: auditorNavItems,
};

interface BottomNavProps {
  role: string;
}

export function BottomNav({ role }: BottomNavProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const navItems = roleNavMap[role] ?? operatorNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60 shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch h-16 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const href = `/${locale}${item.href}`;
          const isActive =
            pathname === href ||
            (item.href !== `/${role}` && pathname.startsWith(href));

          return (
            <Link
              key={item.href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
            >
              {/* Icon with active pill background */}
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-2xl transition-all",
                  isActive
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] leading-none",
                  isActive
                    ? "font-semibold text-primary"
                    : "text-muted-foreground"
                )}
              >
                {t(item.labelKey as Parameters<typeof t>[0])}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
