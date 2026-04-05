"use client";

import { FleetMap } from "@/components/dashboard/fleet-map";
import type { FleetPositionRow } from "@/lib/actions/reports";

interface Props {
  positions: FleetPositionRow[];
}

export function FleetMapClient({ positions }: Props) {
  return <FleetMap positions={positions} />;
}
