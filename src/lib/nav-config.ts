import {
  Home,
  ClipboardList,
  Receipt,
  Trees,
  MoreHorizontal,
  Truck,
  FolderKanban,
  ArrowLeftRight,
  Wallet,
  Coins,
  TrendingUp,
  Users,
  FileBarChart,
  Download,
  Plus,
  type LucideIcon,
} from "lucide-react";

export type RoleNavKey = "operator" | "admin" | "finance" | "owner" | "auditor";

export type NavTab =
  | { kind: "link"; href: string; labelKey: string; icon: LucideIcon }
  | { kind: "action"; action: "more"; labelKey: string; icon: LucideIcon };

export interface FabConfig {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

export interface NavConfig {
  tabs: NavTab[];
  fab?: FabConfig;
}

const moreTab: NavTab = {
  kind: "action",
  action: "more",
  labelKey: "more",
  icon: MoreHorizontal,
};

const operatorConfig: NavConfig = {
  tabs: [
    { kind: "link", href: "/operator", labelKey: "home", icon: Home },
    { kind: "link", href: "/operator/history", labelKey: "history", icon: ClipboardList },
    { kind: "link", href: "/operator/expenses", labelKey: "expenses", icon: Receipt },
    { kind: "link", href: "/operator/leave", labelKey: "leave", icon: Trees },
    moreTab,
  ],
  fab: { href: "/operator/log", labelKey: "logWork", icon: Plus },
};

const adminConfig: NavConfig = {
  tabs: [
    { kind: "link", href: "/admin", labelKey: "home", icon: Home },
    { kind: "link", href: "/admin/vehicles", labelKey: "vehicles", icon: Truck },
    { kind: "link", href: "/admin/projects", labelKey: "projects", icon: FolderKanban },
    { kind: "link", href: "/admin/invoices", labelKey: "invoices", icon: Receipt },
    moreTab,
  ],
  fab: { href: "/admin/projects/new", labelKey: "newJob", icon: Plus },
};

const financeConfig: NavConfig = {
  tabs: [
    { kind: "link", href: "/finance", labelKey: "home", icon: Home },
    { kind: "link", href: "/finance/receivables", labelKey: "receivables", icon: ArrowLeftRight },
    { kind: "link", href: "/finance/cash-transactions", labelKey: "cash", icon: Wallet },
    { kind: "link", href: "/finance/invoices", labelKey: "invoices", icon: Receipt },
    moreTab,
  ],
  fab: { href: "/finance/cash-transactions/new", labelKey: "newReceipt", icon: Plus },
};

const ownerConfig: NavConfig = {
  tabs: [
    { kind: "link", href: "/owner", labelKey: "home", icon: Home },
    { kind: "link", href: "/owner/finance", labelKey: "finance", icon: Coins },
    { kind: "link", href: "/owner/staff-performance", labelKey: "staff", icon: Users },
    { kind: "link", href: "/owner/reports", labelKey: "reports", icon: TrendingUp },
    moreTab,
  ],
};

const auditorConfig: NavConfig = {
  tabs: [
    { kind: "link", href: "/auditor", labelKey: "home", icon: Home },
    { kind: "link", href: "/auditor/reports", labelKey: "reports", icon: FileBarChart },
    { kind: "link", href: "/auditor/transactions", labelKey: "transactions", icon: ArrowLeftRight },
    { kind: "link", href: "/auditor/export", labelKey: "export", icon: Download },
    moreTab,
  ],
};

const configs: Record<RoleNavKey, NavConfig> = {
  operator: operatorConfig,
  admin: adminConfig,
  finance: financeConfig,
  owner: ownerConfig,
  auditor: auditorConfig,
};

export function getNavConfig(role: RoleNavKey): NavConfig {
  return configs[role];
}
