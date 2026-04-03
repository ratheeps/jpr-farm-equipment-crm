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
} from "lucide-react";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tVehicles = await getTranslations("vehicles");
  const tStaff = await getTranslations("staff");
  const tProjects = await getTranslations("projects");
  const tInvoices = await getTranslations("invoices" as never);
  const tFarms = await getTranslations("farms");
  const tFinance = await getTranslations("finance");

  const menuItems = [
    {
      href: `/${locale}/admin/vehicles`,
      icon: Car,
      label: tVehicles("title"),
      color: "bg-green-50 text-green-700 border-green-200",
    },
    {
      href: `/${locale}/admin/staff`,
      icon: Users,
      label: tStaff("title"),
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      href: `/${locale}/admin/projects`,
      icon: FolderKanban,
      label: tProjects("title"),
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      href: `/${locale}/admin/invoices`,
      icon: Receipt,
      label: "Invoices",
      color: "bg-orange-50 text-orange-700 border-orange-200",
    },
    {
      href: `/${locale}/admin/farms`,
      icon: Wheat,
      label: tFarms("title"),
      color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    {
      href: `/${locale}/admin/finance`,
      icon: DollarSign,
      label: tFinance("title"),
      color: "bg-red-50 text-red-700 border-red-200",
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
                className={`flex flex-col items-center justify-center gap-2 border rounded-xl p-5 active:scale-95 transition-transform ${item.color}`}
              >
                <Icon className="h-8 w-8" />
                <span className="text-sm font-semibold text-center">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
