import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { OfflineBanner } from "@/components/offline-banner";
import { LogWorkCard } from "@/components/operator/log-work-card";
import {
  getTodayLog,
  getActiveVehicles,
  getActiveProjects,
} from "@/lib/actions/daily-logs";

export default async function OperatorLogPage() {
  const t = await getTranslations("operator");

  const [todayLog, vehicles, projects] = await Promise.all([
    getTodayLog(),
    getActiveVehicles(),
    getActiveProjects(),
  ]);

  return (
    <div>
      <Topbar title={t("todayLog")} showBack />
      <OfflineBanner />
      <div className="px-4 py-6">
        <LogWorkCard
          todayLog={todayLog as never}
          vehicles={vehicles}
          projects={projects}
        />
      </div>
    </div>
  );
}
