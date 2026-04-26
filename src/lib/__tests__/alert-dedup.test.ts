import { describe, it, expect } from "vitest";

interface AlertEvent {
  vehicleId: string;
  type: string;
  eventDate: string;
  resolvedAt: string | null;
}

interface ScanResult {
  vehicleId: string;
  type: string;
  eventDate: string;
  severity: "warn" | "critical";
}

function computeAlertActions(existing: AlertEvent[], scanned: ScanResult[]) {
  const toInsert: ScanResult[] = [];
  const toClose: AlertEvent[] = [];

  for (const scan of scanned) {
    const match = existing.find(
      (e) => e.vehicleId === scan.vehicleId && e.type === scan.type
        && e.eventDate === scan.eventDate && e.resolvedAt === null
    );
    if (!match) toInsert.push(scan);
  }

  for (const alert of existing) {
    if (alert.resolvedAt !== null) continue;
    const stillActive = scanned.some(
      (s) => s.vehicleId === alert.vehicleId && s.type === alert.type
        && s.eventDate === alert.eventDate
    );
    if (!stillActive) toClose.push(alert);
  }

  return { toInsert, toClose };
}

describe("alert dedup logic", () => {
  it("should not create duplicate alert for same vehicle+type+date", () => {
    const existing: AlertEvent[] = [
      { vehicleId: "v1", type: "idle_hours", eventDate: "2026-04-18", resolvedAt: null },
    ];
    const scanned: ScanResult[] = [
      { vehicleId: "v1", type: "idle_hours", eventDate: "2026-04-18", severity: "warn" },
    ];
    const { toInsert } = computeAlertActions(existing, scanned);
    expect(toInsert).toHaveLength(0);
  });

  it("should auto-close resolved alerts", () => {
    const existing: AlertEvent[] = [
      { vehicleId: "v1", type: "idle_hours", eventDate: "2026-04-18", resolvedAt: null },
    ];
    const scanned: ScanResult[] = [];
    const { toClose } = computeAlertActions(existing, scanned);
    expect(toClose).toHaveLength(1);
    expect(toClose[0].vehicleId).toBe("v1");
  });

  it("should re-open if metric goes critical again after resolution", () => {
    const existing: AlertEvent[] = [
      { vehicleId: "v1", type: "idle_hours", eventDate: "2026-04-18", resolvedAt: "2026-04-18T10:00:00Z" },
    ];
    const scanned: ScanResult[] = [
      { vehicleId: "v1", type: "idle_hours", eventDate: "2026-04-18", severity: "critical" },
    ];
    const { toInsert, toClose } = computeAlertActions(existing, scanned);
    expect(toInsert).toHaveLength(1);
    expect(toClose).toHaveLength(0);
  });
});
