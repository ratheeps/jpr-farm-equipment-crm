import { getTranslations } from "next-intl/server";
import { Topbar } from "@/components/layout/topbar";
import { OfflineBanner } from "@/components/offline-banner";
import { LogWorkCard } from "@/components/operator/log-work-card";
import {
  getTodayLog,
  getMyAssignedProjects,
  getTodayCompletedLogs,
} from "@/lib/actions/daily-logs";
import {
  getMyVehicleAssignment,
  getMyAssignedVehicles,
} from "@/lib/actions/vehicle-assignments";

export default async function OperatorLogPage() {
  const t = await getTranslations("operator");

  const [todayLog, assignedVehicles, projects, myAssignment, completedLogs] = await Promise.all([
    getTodayLog(),
    getMyAssignedVehicles(),
    getMyAssignedProjects(),
    getMyVehicleAssignment(),
    getTodayCompletedLogs(),
  ]);

  return (
    <div>
      <Topbar title={t("todayLog")} showBack />
      <OfflineBanner />
      <div className="px-4 py-6">
        <LogWorkCard
          todayLog={todayLog as never}
          vehicles={assignedVehicles}
          projects={projects}
          assignedVehicleId={myAssignment?.vehicleId ?? null}
          completedLogs={completedLogs as never}
        />
      </div>
    </div>
  );
}
