"use client";

import { useState } from "react";
import { LogEditForm } from "./log-edit-form";
import { Pencil } from "lucide-react";

interface AdminLog {
  id: string;
  date: string;
  vehicleName: string;
  vehicleId: string;
  operatorName: string;
  operatorId: string;
  projectName: string | null;
  startEngineHours: string;
  endEngineHours: string | null;
  fuelUsedLiters: string | null;
  kmTraveled: string | null;
  acresWorked: string | null;
  notes: string | null;
  syncStatus: string;
}

export function AdminLogList({ logs }: { logs: AdminLog[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="bg-card border border-border rounded-xl p-3">
          {editingId === log.id ? (
            <LogEditForm log={log} onClose={() => setEditingId(null)} />
          ) : (
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{log.vehicleName}</p>
                  <p className="text-xs text-muted-foreground">{log.date} · {log.operatorName}</p>
                  {log.projectName && (
                    <p className="text-xs text-muted-foreground">Project: {log.projectName}</p>
                  )}
                </div>
                <button
                  onClick={() => setEditingId(log.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Hours: </span>
                  {log.startEngineHours}→{log.endEngineHours ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Fuel: </span>
                  {log.fuelUsedLiters ?? "—"}L
                </div>
                <div>
                  <span className="text-muted-foreground">Km: </span>
                  {log.kmTraveled ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Acres: </span>
                  {log.acresWorked ?? "—"}
                </div>
              </div>
              {log.notes && (
                <p className="mt-1 text-xs text-muted-foreground truncate">{log.notes}</p>
              )}
              <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                log.syncStatus === "synced" ? "bg-green-100 text-green-700" :
                log.syncStatus === "conflict" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>
                {log.syncStatus}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
