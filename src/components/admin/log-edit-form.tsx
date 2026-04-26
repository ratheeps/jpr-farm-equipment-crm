"use client";

import { useState, useTransition } from "react";
import { updateLogByAdmin } from "@/lib/actions/admin-logs";

interface LogEditFormProps {
  log: {
    id: string;
    date: string;
    vehicleName: string;
    operatorName: string;
    startEngineHours: string;
    endEngineHours: string | null;
    fuelUsedLiters: string | null;
    kmTraveled: string | null;
    acresWorked: string | null;
    notes: string | null;
  };
  onClose: () => void;
}

export function LogEditForm({ log, onClose }: LogEditFormProps) {
  const [fuel, setFuel] = useState(log.fuelUsedLiters ?? "");
  const [km, setKm] = useState(log.kmTraveled ?? "");
  const [acres, setAcres] = useState(log.acresWorked ?? "");
  const [notes, setNotes] = useState(log.notes ?? "");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError("");
    setWarning("");
    startTransition(async () => {
      try {
        const result = await updateLogByAdmin(log.id, {
          fuelUsedLiters: fuel || null,
          kmTraveled: km || null,
          acresWorked: acres || null,
          notes: notes || null,
        });
        if (result.warning) {
          setWarning(result.warning);
        }
        onClose();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="p-3 bg-secondary/30 rounded-xl space-y-3 border border-border">
      {/* Read-only info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>Date: {log.date} · Vehicle: {log.vehicleName} · Operator: {log.operatorName}</p>
        <p>Engine Hours: {log.startEngineHours} → {log.endEngineHours ?? "—"}</p>
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Fuel (L)</label>
          <input
            type="number"
            step="0.01"
            value={fuel}
            onChange={(e) => setFuel(e.target.value)}
            className="w-full h-9 px-2 border border-border rounded-lg text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Km</label>
          <input
            type="number"
            step="0.1"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            className="w-full h-9 px-2 border border-border rounded-lg text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Acres</label>
          <input
            type="number"
            step="0.01"
            value={acres}
            onChange={(e) => setAcres(e.target.value)}
            className="w-full h-9 px-2 border border-border rounded-lg text-sm bg-background"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-2 py-1 border border-border rounded-lg text-sm bg-background"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {warning && <p className="text-sm text-yellow-600">{warning}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onClose}
          className="h-9 px-4 border border-border rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
