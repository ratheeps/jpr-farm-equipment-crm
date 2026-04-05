import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { getFarms } from "@/lib/actions/farms";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function FarmsPage({
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

  const t = await getTranslations("farms");
  const tCommon = await getTranslations("common");

  const allFarms = await getFarms();

  return (
    <div>
      <Topbar title={t("title")} />
      <div className="px-4 py-4">
        <Link
          href={`/${locale}/admin/farms/new`}
          className="flex items-center justify-center gap-2 w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold mb-4"
        >
          <Plus className="h-5 w-5" />
          {t("add")}
        </Link>

        {allFarms.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {t("noFarms")}
          </p>
        ) : (
          <div className="space-y-3">
            {allFarms.map((farm) => (
              <Link
                key={farm.id}
                href={`/${locale}/admin/farms/${farm.id}`}
                className="block bg-card border border-border rounded-xl p-4 active:scale-98 transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {farm.name}
                    </p>
                    {farm.locationText && (
                      <p className="text-sm text-muted-foreground truncate">
                        {farm.locationText}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      farm.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {farm.isActive ? tCommon("active") : tCommon("inactive")}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {farm.areaAcres} {t("areaAcres").replace("Area ", "").replace("(", "").replace(")", "")}
                  </span>
                  {farm.cycleCount > 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {farm.cycleCount} {t("cycles").toLowerCase()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
