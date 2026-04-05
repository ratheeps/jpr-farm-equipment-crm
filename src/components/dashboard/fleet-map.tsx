"use client";

import type { FleetPositionRow } from "@/lib/actions/reports";
import { MapPin } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500",
  maintenance: "bg-amber-500",
  inactive: "bg-red-500",
};

interface Props {
  positions: FleetPositionRow[];
}

export function FleetMap({ positions }: Props) {
  if (positions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No GPS data available. Start logging work with GPS enabled.
      </p>
    );
  }

  // Build an OpenStreetMap embed URL centred on the average position
  const avgLat = positions.reduce((s, p) => s + p.lat, 0) / positions.length;
  const avgLng = positions.reduce((s, p) => s + p.lng, 0) / positions.length;
  // OSM attribution-compliant embed URL
  const embedUrl =
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${avgLng - 0.15},${avgLat - 0.1},${avgLng + 0.15},${avgLat + 0.1}` +
    `&layer=mapnik` +
    positions.map((p) => `&marker=${p.lat},${p.lng}`).join("");

  return (
    <div className="space-y-3">
      {/* Map iframe */}
      <div className="w-full rounded-xl overflow-hidden border border-border" style={{ height: 240 }}>
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          title="Fleet positions map"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full border-0"
        />
      </div>

      {/* Vehicle list */}
      <div className="space-y-1.5">
        {positions.map((pos) => (
          <a
            key={pos.vehicleId}
            href={`https://www.openstreetmap.org/?mlat=${pos.lat}&mlon=${pos.lng}#map=15/${pos.lat}/${pos.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[pos.vehicleStatus] ?? "bg-muted-foreground"}`}
            />
            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{pos.vehicleName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {pos.operatorName} · {pos.lastLogDate}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
              {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
