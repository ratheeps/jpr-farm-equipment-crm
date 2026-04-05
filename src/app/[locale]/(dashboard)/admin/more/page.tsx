import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import Link from "next/link";
import { Truck, Wrench, Wheat } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { vehicles, maintenanceSchedules } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";

export default async function AdminMorePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!["super_admin", "admin"].includes(session.role)) {
    redirect(`/${locale}/operator`);
  }

  const tVehicles = await getTranslations("vehicles");
  const tMaintenance = await getTranslations("maintenance");
  const tFarms = await getTranslations("farms");

  const [activeVehicles, overdueSchedules] = await Promise.all([
    db
      .select({ count: count() })
      .from(vehicles)
      .where(eq(vehicles.status, "active")),
    db
      .select({ count: count() })
      .from(maintenanceSchedules)
      .where(eq(maintenanceSchedules.isOverdue, true)),
  ]);

  const vehicleCount = activeVehicles[0]?.count ?? 0;
  const overdueCount = overdueSchedules[0]?.count ?? 0;

  const menuItems = [
    {
      href: `/${locale}/admin/vehicles`,
      icon: Truck,
      label: tVehicles("title"),
      subtitle: `${vehicleCount} active`,
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      href: `/${locale}/admin/maintenance`,
      icon: Wrench,
      label: tMaintenance("title"),
      subtitle:
        overdueCount > 0
          ? `${overdueCount} ${tMaintenance("overdue")}`
          : tMaintenance("allClear"),
      color:
        overdueCount > 0
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-orange-50 text-orange-700 border-orange-200",
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
    {
      href: `/${locale}/admin/farms`,
      icon: Wheat,
      label: tFarms("title"),
      subtitle: "",
      color: "bg-green-50 text-green-700 border-green-200",
    },
  ];

  return (
    <div>
      <Topbar title="More" />
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
                {item.badge && (
                  <span className="absolute top-2 right-2 h-5 w-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
                <Icon className="h-8 w-8" />
                <div className="text-center">
                  <p className="text-sm font-semibold">{item.label}</p>
                  {item.subtitle && (
                    <p className="text-[10px] opacity-70 mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
