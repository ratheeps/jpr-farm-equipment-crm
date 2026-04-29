"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  Truck,
  Wrench,
  Users,
  Sprout,
  Wheat,
  FileText,
  Settings,
  KeyRound,
  CalendarDays,
  DollarSign,
  ClipboardList,
  CalendarCheck,
  TrendingUp,
  Wallet,
  LogOut,
  Bell,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { useRouter } from "next/navigation";

interface MenuItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
}

interface MenuSection {
  heading: string;
  items: MenuItem[];
}

const ownerMenu: MenuSection[] = [
  {
    heading: "Vehicle",
    items: [
      { href: "/admin/vehicles", labelKey: "manageVehicles", icon: Truck },
      { href: "/admin/maintenance", labelKey: "maintenance", icon: Wrench },
    ],
  },
  {
    heading: "Farm",
    items: [
      { href: "/admin/farms", labelKey: "farms", icon: Sprout },
      { href: "/admin/farms", labelKey: "recordInput", icon: ClipboardList },
      { href: "/admin/farms", labelKey: "recordHarvest", icon: Wheat },
    ],
  },
  {
    heading: "Staff",
    items: [
      { href: "/admin/staff", labelKey: "manageStaff", icon: Users },
      { href: "/owner/staff-performance", labelKey: "staffPerformance", icon: TrendingUp },
    ],
  },
  {
    heading: "Other",
    items: [
      { href: "/admin/quotes", labelKey: "quotes", icon: FileText },
      { href: "/admin/settings", labelKey: "settings", icon: Settings },
      { href: "/owner/password", labelKey: "changePassword", icon: KeyRound },
    ],
  },
];

const adminMenu: MenuSection[] = [
  {
    heading: "Vehicle",
    items: [
      { href: "/admin/vehicles", labelKey: "manageVehicles", icon: Truck },
      { href: "/admin/maintenance", labelKey: "maintenance", icon: Wrench },
    ],
  },
  {
    heading: "Farm",
    items: [
      { href: "/admin/farms", labelKey: "farms", icon: Sprout },
      { href: "/admin/farms", labelKey: "recordInput", icon: ClipboardList },
      { href: "/admin/farms", labelKey: "recordHarvest", icon: Wheat },
    ],
  },
  {
    heading: "Staff",
    items: [
      { href: "/admin/staff/leaves", labelKey: "leaves", icon: CalendarCheck },
      { href: "/admin/staff/payroll", labelKey: "payroll", icon: DollarSign },
      { href: "/admin/staff/schedule", labelKey: "schedule", icon: CalendarDays },
    ],
  },
  {
    heading: "Other",
    items: [
      { href: "/admin/quotes", labelKey: "quotes", icon: FileText },
      { href: "/admin/settings", labelKey: "settings", icon: Settings },
      { href: "/admin/password", labelKey: "changePassword", icon: KeyRound },
    ],
  },
];

const operatorMenu: MenuSection[] = [
  {
    heading: "Other",
    items: [
      { href: "/operator/leave", labelKey: "leave", icon: CalendarCheck },
      { href: "/operator/password", labelKey: "changePassword", icon: KeyRound },
    ],
  },
];

const auditorMenu: MenuSection[] = [
  {
    heading: "Other",
    items: [
      { href: "/auditor/finance", labelKey: "auditorFinance", icon: Wallet },
      { href: "/auditor/password", labelKey: "changePassword", icon: KeyRound },
    ],
  },
];

const financeMenu: MenuSection[] = [
  {
    heading: "Other",
    items: [
      { href: "/finance/quotes", labelKey: "quotes", icon: FileText },
      { href: "/finance/cash-transactions", labelKey: "cashTransactions", icon: Coins },
      { href: "/finance/notifications", labelKey: "notifications", icon: Bell },
      { href: "/finance/password", labelKey: "changePassword", icon: KeyRound },
    ],
  },
];

const roleMenuMap: Record<string, MenuSection[]> = {
  owner: ownerMenu,
  admin: adminMenu,
  operator: operatorMenu,
  auditor: auditorMenu,
  finance: financeMenu,
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  operator: "Operator",
  auditor: "Auditor",
  finance: "Finance",
};

interface SlidingMenuProps {
  open: boolean;
  onClose: () => void;
  role: string;
}

export function SlidingMenu({ open, onClose, role }: SlidingMenuProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const sections = roleMenuMap[role] ?? operatorMenu;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(`/${locale}/login`);
  }

  return (
    <Sheet open={open} onClose={onClose} side="right">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/60">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground leading-tight">JPR App</p>
          <p className="text-xs text-muted-foreground capitalize">{roleLabels[role] ?? role}</p>
        </div>
      </div>

      {/* Menu sections */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {sections.map((section) => (
          <div key={section.heading} className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1">
              {section.heading}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const href = `/${locale}${item.href}`;
              const isActive = pathname === href || pathname.startsWith(href + "/");

              return (
                <Link
                  key={`${item.href}-${item.labelKey}`}
                  href={href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all active:scale-[0.98]",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  <span>{t(item.labelKey as Parameters<typeof t>[0])}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: logout */}
      <div className="border-t border-border/60 px-3 py-3 pb-safe">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-all active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span>Logout</span>
        </button>
      </div>
    </Sheet>
  );
}
