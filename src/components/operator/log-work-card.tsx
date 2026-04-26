"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, Fuel, Gauge, TreePine } from "lucide-react";
import { startLog, endLog, getLastEndEngineHours } from "@/lib/actions/daily-logs";
import { localDb } from "@/lib/offline/db";
import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  name: string;
  registrationNumber: string | null;
  vehicleType: string;
  billingModel: string;
  currentEngineHours: string | null;
  tripAllowance?: string | null;
}

interface Project {
  id: string;
  clientName: string;
  siteLocation: string | null;
}

interface ActiveLog {
  id: string;
  date: string;
  startTime: Date | null;
  endTime: Date | null;
  startEngineHours: string;
  endEngineHours: string | null;
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  billingModel: string;
  projectId: string | null;
  gpsLatStart: string | null;
  gpsLngStart: string | null;
}

interface CompletedLog {
  id: string;
  startEngineHours: string;
  endEngineHours: string | null;
  startTime: Date | null;
  endTime: Date | null;
  vehicleName: string;
}

interface Props {
  todayLog: ActiveLog | null;
  vehicles: Vehicle[];
  projects: Project[];
  assignedVehicleId?: string | null;
  completedLogs?: CompletedLog[];
}

function generateDeviceId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function captureGps(): Promise<{ lat: string; lng: string } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude.toFixed(7),
          lng: pos.coords.longitude.toFixed(7),
        }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 30000 }
    );
  });
}

export function LogWorkCard({ todayLog, vehicles, projects, assignedVehicleId, completedLogs = [] }: Props) {
  const t = useTranslations("operator");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  // Start form state — prefer assigned vehicle, then first vehicle
  const defaultVehicleId = assignedVehicleId ?? vehicles[0]?.id ?? "";
  const [vehicleId, setVehicleId] = useState(defaultVehicleId);
  const [projectId, setProjectId] = useState("");
  const [startHours, setStartHours] = useState("");
  // GPS captured silently on mount
  const [gpsCoords, setGpsCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [startError, setStartError] = useState("");

  // End form state
  const [endHours, setEndHours] = useState("");
  const [fuel, setFuel] = useState("");
  const [km, setKm] = useState("");
  const [acres, setAcres] = useState("");
  const [tripOverride, setTripOverride] = useState("");
  const [endNotes, setEndNotes] = useState("");
  const [endError, setEndError] = useState("");

  // Active log (may update after start)
  const [activeLog, setActiveLog] = useState<ActiveLog | null>(todayLog);

  // Capture GPS silently on mount — used for start/end logs without showing to operator
  useEffect(() => {
    captureGps().then((coords) => {
      if (coords) setGpsCoords(coords);
    });
  }, []);

  // Prefill start engine hours from previous log's end hours, falling back to vehicle's current hours
  useEffect(() => {
    if (!activeLog && vehicleId) {
      getLastEndEngineHours(vehicleId).then((lastEnd) => {
        if (lastEnd) {
          setStartHours(lastEnd);
        } else {
          const v = vehicles.find((x) => x.id === vehicleId);
          if (v?.currentEngineHours) setStartHours(v.currentEngineHours);
        }
      });
    }
  }, [vehicleId, vehicles, activeLog]);

  function handleStartWork() {
    if (!vehicleId || !startHours) return;

    startTransition(async () => {
      setStartError("");
      const isOnline = navigator.onLine;

      if (isOnline) {
        try {
          await startLog({
            vehicleId,
            projectId: projectId || undefined,
            startEngineHours: startHours,
            gpsLatStart: gpsCoords?.lat,
            gpsLngStart: gpsCoords?.lng,
          });
          // Reload page to show active log
          window.location.reload();
        } catch (err) {
          setStartError(err instanceof Error ? err.message : t("startWork"));
        }
      } else {
        // Offline — save to IndexedDB
        const deviceId = generateDeviceId();
        await localDb.offlineLogs.add({
          deviceId,
          vehicleId,
          projectId: projectId || undefined,
          date: new Date().toISOString().split("T")[0],
          startEngineHours: parseFloat(startHours),
          startTime: Date.now(),
          gpsLatStart: gpsCoords ? parseFloat(gpsCoords.lat) : undefined,
          gpsLngStart: gpsCoords ? parseFloat(gpsCoords.lng) : undefined,
          action: "start",
          syncStatus: "local",
          createdAt: Date.now(),
        });
        // Show offline placeholder
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        setActiveLog({
          id: deviceId, // temporary local ID
          date: new Date().toISOString().split("T")[0],
          startTime: new Date(),
          endTime: null,
          startEngineHours: startHours,
          endEngineHours: null,
          vehicleId: vehicleId,
          vehicleName: vehicle?.name ?? "",
          vehicleType: vehicle?.vehicleType ?? "",
          billingModel: vehicle?.billingModel ?? "",
          projectId: projectId || null,
          gpsLatStart: gpsCoords?.lat ?? null,
          gpsLngStart: gpsCoords?.lng ?? null,
        });
      }
    });
  }

  function handleEndWork() {
    if (!activeLog || !endHours) return;

    startTransition(async () => {
      setEndError("");

      // Capture end GPS
      const coords = await captureGps();
      const isOnline = navigator.onLine;

      if (isOnline) {
        try {
          await endLog(activeLog.id, {
            endEngineHours: endHours,
            fuelUsedLiters: fuel || undefined,
            kmTraveled: km || undefined,
            acresWorked: acres || undefined,
            tripAllowanceOverride: tripOverride || undefined,
            gpsLatEnd: coords?.lat,
            gpsLngEnd: coords?.lng,
            notes: endNotes || undefined,
          });
          window.location.reload();
        } catch (err) {
          setEndError(err instanceof Error ? err.message : t("endWork"));
        }
      } else {
        // Offline
        const deviceId = generateDeviceId();
        await localDb.offlineLogs.add({
          deviceId,
          serverId: activeLog.id, // the server ID we'll update
          vehicleId: activeLog.id, // not used for end action
          date: activeLog.date,
          startEngineHours: parseFloat(activeLog.startEngineHours),
          endEngineHours: parseFloat(endHours),
          endTime: Date.now(),
          gpsLatEnd: coords ? parseFloat(coords.lat) : undefined,
          gpsLngEnd: coords ? parseFloat(coords.lng) : undefined,
          fuelUsedLiters: fuel ? parseFloat(fuel) : undefined,
          kmTraveled: km ? parseFloat(km) : undefined,
          acresWorked: acres ? parseFloat(acres) : undefined,
          notes: endNotes || undefined,
          action: "end",
          syncStatus: "local",
          createdAt: Date.now(),
        });
        // Show as completed locally
        setActiveLog({ ...activeLog, endTime: new Date(), endEngineHours: endHours });
      }
    });
  }

  // Completed log view — allow starting a new session
  if (activeLog?.endEngineHours) {
    const startH = parseFloat(activeLog.startEngineHours);
    const endH = parseFloat(activeLog.endEngineHours);
    const worked = (endH - startH).toFixed(1);

    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-800">{t("logCompleted")}</span>
          </div>
          <p className="text-sm text-green-700 font-medium mb-1">{activeLog.vehicleName}</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <span>{t("startHours")}: {activeLog.startEngineHours}</span>
            <span>{t("endHours")}: {activeLog.endEngineHours}</span>
            <span className="col-span-2 font-medium text-foreground">{t("hoursWorked")}: {worked} hrs</span>
          </div>
        </div>

        {/* Start another work session */}
        <button
          onClick={() => setActiveLog(null)}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-base font-bold active:scale-95 transition-transform"
        >
          {t("startWork")} (New Session)
        </button>

        {/* All completed sessions today */}
        {completedLogs.length > 0 && <CompletedLogsList logs={completedLogs} t={t} />}
      </div>
    );
  }

  // Active log — show End Work form
  if (activeLog) {
    const selectedVehicle = vehicles.find((v) => v.id === activeLog.vehicleId) ?? {
      billingModel: activeLog.billingModel,
    };
    const showKm = activeLog.billingModel === "per_km";
    const showAcres = activeLog.billingModel === "per_acre";

    return (
      <div className="space-y-4">
        {/* Active log info card */}
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">{t("activeLog")}</span>
          </div>
          <p className="font-medium text-foreground">{activeLog.vehicleName}</p>
          <p className="text-sm text-muted-foreground">
            {t("startHours")}: {activeLog.startEngineHours}
          </p>
        </div>

        {/* End work form */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t("endHours")} <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={endHours}
              onChange={(e) => setEndHours(e.target.value)}
              placeholder="e.g. 1252.0"
              className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <span className="flex items-center gap-1"><Fuel className="h-4 w-4" />{t("fuelUsed")}</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              placeholder="0.0"
              className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {showKm && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("kmTraveled")}
              </label>
              <input
                type="number"
                step="0.1"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="0.0"
                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {showAcres && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <span className="flex items-center gap-1"><TreePine className="h-4 w-4" />{t("acresWorked")}</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={acres}
                onChange={(e) => setAcres(e.target.value)}
                placeholder="0.00"
                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {activeLog.billingModel === "per_km" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t("tripAllowanceOverride")}
              </label>
              <input
                type="number"
                step="0.01"
                value={tripOverride}
                onChange={(e) => setTripOverride(e.target.value)}
                placeholder={selectedVehicle && 'tripAllowance' in selectedVehicle ? `Default: ${(selectedVehicle as Vehicle).tripAllowance ?? "0"}` : "0.00"}
                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {tc("notes")}
            </label>
            <textarea
              value={endNotes}
              onChange={(e) => setEndNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {endError && <p className="text-sm text-destructive">{endError}</p>}

          <button
            onClick={handleEndWork}
            disabled={!endHours || isPending}
            className={cn(
              "w-full h-14 rounded-2xl text-lg font-bold transition-transform active:scale-95",
              endHours && !isPending
                ? "bg-destructive text-destructive-foreground shadow-md"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isPending ? "..." : t("endWork")}
          </button>
        </div>
      </div>
    );
  }

  // No log today — show Start Work form
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {t("vehicle")} <span className="text-destructive">*</span>
        </label>
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t("selectVehicle")}</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} {v.registrationNumber ? `(${v.registrationNumber})` : ""}
              {v.id === assignedVehicleId ? " ★" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {t("project")}
        </label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t("selectProject")}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.clientName}{p.siteLocation ? ` — ${p.siteLocation}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          <span className="flex items-center gap-1">
            <Gauge className="h-4 w-4" />
            {t("startHours")} <span className="text-destructive">*</span>
          </span>
        </label>
        <input
          type="number"
          step="0.1"
          value={startHours}
          onChange={(e) => setStartHours(e.target.value)}
          placeholder="e.g. 1240.5"
          className="w-full h-12 rounded-xl border border-input bg-background px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {startError && <p className="text-sm text-destructive">{startError}</p>}

      <button
        onClick={handleStartWork}
        disabled={!vehicleId || !startHours || isPending}
        className={cn(
          "w-full h-16 rounded-2xl text-xl font-bold transition-transform active:scale-95",
          vehicleId && startHours && !isPending
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {isPending ? "..." : t("startWork")}
      </button>

      {/* Show today's completed sessions even when no active log */}
      {completedLogs.length > 0 && <CompletedLogsList logs={completedLogs} t={t} />}
    </div>
  );
}

/** Small helper to list today's completed work sessions */
function formatTime(d: Date | null): string {
  if (!d) return "—";
  // Use the ISO string to format HH:MM — consistent between server and client
  const iso = new Date(d).toISOString();
  const [, time] = iso.split("T");
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

function CompletedLogsList({
  logs,
  t,
}: {
  logs: CompletedLog[];
  // eslint-disable-next-line -- next-intl translation function
  t: any;
}) {
  return (
    <div className="space-y-2 pt-2 border-t border-border/60">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Today&apos;s Sessions
      </p>
      {logs.map((log, i) => {
        const worked =
          log.startEngineHours && log.endEngineHours
            ? (parseFloat(log.endEngineHours) - parseFloat(log.startEngineHours)).toFixed(1)
            : null;
        const startStr = formatTime(log.startTime);
        const endStr = formatTime(log.endTime);
        return (
          <div
            key={log.id}
            className="rounded-xl bg-muted/60 px-3 py-2 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {i + 1}. {log.vehicleName}
              </p>
              <p className="text-xs text-muted-foreground">
                {startStr} → {endStr}
              </p>
            </div>
            {worked && (
              <span className="shrink-0 text-sm font-semibold text-foreground">
                {worked} hrs
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
