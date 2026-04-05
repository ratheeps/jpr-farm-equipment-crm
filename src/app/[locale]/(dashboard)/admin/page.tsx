import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import Link from "next/link";
import {
  Car,
  Users,
  FolderKanban,
  Receipt,
  Wheat,
  DollarSign,
  Settings,
  FileText,
  Wrench,
} from "lucide-react";
import { db } from "@/db";
import { vehicles, users as usersTable, projects, invoices, quotes as quotesTable, paddyFarms, maintenanceSchedules } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tVehicles = await getTranslations("vehicles");
  const tStaff = await getTranslations("staff");
  const tProjects = await getTranslations("projects");
  const tFarms = await getTranslations("farms");
  const tFinance = await getTranslations("finance");
  const tMaintenance = await getTranslations("maintenance");

  const [
    [{ vehicleCount }],
    [{ staffCount }],
    [{ projectCount }],
    [{ invoiceCount }],
    [{ quoteCount }],
    [{ farmCount }],
    [{ overdueCount }],
  ] = await Promise.all([
    db.select({ vehicleCount: count() }).from(vehicles).where(eq(vehicles.status, "active")),
    db.select({ staffCount: count() }).from(usersTable),
    db.select({ projectCount: count() }).from(projects).where(eq(projects.status, "active")),
    db.select({ invoiceCount: count() }).from(invoices).where(sql`${invoices.status} IN ('sent','overdue')`),
    db.select({ quoteCount: count() }).from(quotesTable),
    db.select({ farmCount: count() }).from(paddyFarms).where(eq(paddyFarms.isActive, true)),
    db.select({ overdueCount: count() }).from(maintenanceSchedules).where(eq(maintenanceSchedules.isOverdue, true)),
  ]);

  const menuItems = [
    {
      href: `/${locale}/admin/vehicles`,
      icon: Car,
      label: tVehicles("title"),
      badge: vehicleCount > 0 ? `${vehicleCount} active` : undefined,
      color: "bg-green-50 text-green-700 border-green-200",
    },
    {
      href: `/${locale}/admin/staff`,
      icon: Users,
      label: tStaff("title"),
      badge: staffCount > 0 ? `${staffCount} members` : undefined,
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      href: `/${locale}/admin/projects`,
      icon: FolderKanban,
      label: tProjects("title"),
      badge: projectCount > 0 ? `${projectCount} active` : undefined,
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      href: `/${locale}/admin/invoices`,
      icon: Receipt,
      label: "Invoices",
      badge: invoiceCount > 0 ? `${invoiceCount} pending` : undefined,
      badgeAlert: invoiceCount > 0,
      color: "bg-orange-50 text-orange-700 border-orange-200",
    },
    {
      href: `/${locale}/admin/quotes`,
      icon: FileText,
      label: "Quotes",
      badge: quoteCount > 0 ? `${quoteCount} total` : undefined,
      color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    },
    {
      href: `/${locale}/admin/farms`,
      icon: Wheat,
      label: tFarms("title"),
      badge: farmCount > 0 ? `${farmCount} active` : undefined,
      color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    {
      href: `/${locale}/admin/maintenance`,
      icon: Wrench,
      label: tMaintenance("title"),
      badge:
        overdueCount > 0
          ? `${overdueCount} ${tMaintenance("overdue")}`
          : tMaintenance("allClear"),
      badgeAlert: overdueCount > 0,
      color:
        overdueCount > 0
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-orange-50 text-orange-700 border-orange-200",
    },
    {
      href: `/${locale}/admin/finance`,
      icon: DollarSign,
      label: tFinance("title"),
      color: "bg-red-50 text-red-700 border-red-200",
    },
    {
      href: `/${locale}/admin/settings`,
      icon: Settings,
      label: "Settings",
      color: "bg-gray-50 text-gray-700 border-gray-200",
    },
  ];

  return (
    <div>
      <Topbar title="JPR Admin" />
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-2 border rounded-xl p-5 active:scale-95 transition-transform ${item.color}`}
              >
                <Icon className="h-8 w-8" />
                <span className="text-sm font-semibold text-center">{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] font-medium opacity-80 -mt-1 ${
                      item.badgeAlert ? "font-bold opacity-100" : ""
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
