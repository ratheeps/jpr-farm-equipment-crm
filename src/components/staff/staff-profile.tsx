import { Car, Briefcase, Clock, Fuel, Tractor } from "lucide-react";

interface VehicleAssignment {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  registrationNumber: string | null;
  isPrimary: boolean;
  assignedFrom: string;
  assignedTo: string | null;
  reason: string | null;
}

interface ProjectAssignment {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  assignedFrom: string | null;
  assignedTo: string | null;
}

interface Stats {
  totalHours: number;
  totalFuel: number;
  totalLogs: number;
  totalAcres: number;
  totalKm: number;
}

interface StaffProfileProps {
  fullName: string | null;
  phone: string | null;
  role: string;
  preferredLocale: string;
  isActive: boolean | null;
  nicNumber: string | null;
  payRate: string | null;
  payType: string | null;
  vehicleAssignments: VehicleAssignment[];
  projectAssignments: ProjectAssignment[];
  stats: Stats | null;
  recentLogs: Array<{
    id: string;
    date: string;
    vehicleName: string;
    vehicleType: string;
    startEngineHours: string;
    endEngineHours: string | null;
    fuelUsedLiters: string | null;
    kmTraveled: string | null;
    acresWorked: string | null;
    syncStatus: string;
  }>;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  operator: "bg-green-100 text-green-700",
  auditor: "bg-yellow-100 text-yellow-700",
};

export function StaffProfile({
  fullName,
  phone,
  role,
  preferredLocale,
  isActive,
  nicNumber,
  payRate,
  payType,
  vehicleAssignments,
  projectAssignments,
  stats,
  recentLogs,
}: StaffProfileProps) {
  return (
    <div className="space-y-5 pb-8">
      {/* Header card */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-foreground">{fullName}</h2>
            <p className="text-sm text-muted-foreground">{phone}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[role] ?? "bg-muted text-muted-foreground"}`}
            >
              {role.replace("_", " ")}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-3">
          {nicNumber && (
            <p className="text-muted-foreground">
              NIC: <span className="text-foreground font-medium">{nicNumber}</span>
            </p>
          )}
          {payRate && payType && (
            <p className="text-muted-foreground">
              Pay:{" "}
              <span className="text-foreground font-medium">
                Rs.{Number(payRate).toLocaleString()} / {payType.replace("_", " ")}
              </span>
            </p>
          )}
          <p className="text-muted-foreground">
            Language: <span className="text-foreground font-medium uppercase">{preferredLocale}</span>
          </p>
        </div>
      </div>

      {/* This month stats */}
      {stats && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            This Month
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-xl font-bold text-foreground">{stats.totalLogs}</p>
              <p className="text-xs text-muted-foreground">Logs</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-xl font-bold text-foreground">{stats.totalHours.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Hours</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-xl font-bold text-foreground">{stats.totalFuel.toFixed(0)}L</p>
              <p className="text-xs text-muted-foreground">Fuel</p>
            </div>
          </div>
          {(stats.totalAcres > 0 || stats.totalKm > 0) && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {stats.totalAcres > 0 && (
                <div className="rounded-xl bg-card border border-border p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{stats.totalAcres.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Acres</p>
                </div>
              )}
              {stats.totalKm > 0 && (
                <div className="rounded-xl bg-card border border-border p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{stats.totalKm.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">KM</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Current vehicle assignments */}
      {vehicleAssignments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Vehicle Assignments
          </p>
          <div className="space-y-2">
            {vehicleAssignments.map((va) => (
              <div
                key={va.id}
                className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
              >
                <Car className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {va.vehicleName}
                    {va.registrationNumber && (
                      <span className="text-muted-foreground ml-1">({va.registrationNumber})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {va.isPrimary ? "Primary" : "Temporary"} · From {va.assignedFrom}
                    {va.assignedTo && ` until ${va.assignedTo}`}
                    {va.reason && ` · ${va.reason}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current project assignments */}
      {projectAssignments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Project Assignments
          </p>
          <div className="space-y-2">
            {projectAssignments.map((pa) => (
              <div
                key={pa.id}
                className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
              >
                <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{pa.projectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {pa.clientName}
                    {pa.assignedFrom && ` · From ${pa.assignedFrom}`}
                    {pa.assignedTo && ` to ${pa.assignedTo}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recentLogs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Recent Activity
          </p>
          <div className="space-y-2">
            {recentLogs.map((log) => {
              const hours =
                log.endEngineHours
                  ? (Number(log.endEngineHours) - Number(log.startEngineHours)).toFixed(1)
                  : null;
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
                >
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{log.vehicleName}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.date}
                      {hours && ` · ${hours} hrs`}
                      {log.fuelUsedLiters && ` · ${log.fuelUsedLiters}L fuel`}
                    </p>
                  </div>
                  {log.syncStatus === "local" && (
                    <span className="text-xs text-amber-600 font-medium">Pending</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
