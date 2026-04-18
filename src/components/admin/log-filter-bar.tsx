"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";

interface FilterBarProps {
  vehicles: { id: string; name: string }[];
  operators: { id: string; fullName: string }[];
}

export function LogFilterBar({ vehicles, operators }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [vehicleId, setVehicleId] = useState(searchParams.get("vehicleId") ?? "");
  const [operatorId, setOperatorId] = useState(searchParams.get("operatorId") ?? "");

  function apply() {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (vehicleId) params.set("vehicleId", vehicleId);
    if (operatorId) params.set("operatorId", operatorId);
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function reset() {
    setDateFrom("");
    setDateTo("");
    setVehicleId("");
    setOperatorId("");
    startTransition(() => {
      router.replace(pathname);
    });
  }

  return (
    <div className="space-y-3 mb-4 p-3 bg-secondary/50 rounded-xl">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-10 px-3 border border-border rounded-lg text-sm bg-background"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-10 px-3 border border-border rounded-lg text-sm bg-background"
          placeholder="To"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="h-10 px-3 border border-border rounded-lg text-sm bg-background"
        >
          <option value="">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <select
          value={operatorId}
          onChange={(e) => setOperatorId(e.target.value)}
          className="h-10 px-3 border border-border rounded-lg text-sm bg-background"
        >
          <option value="">All Operators</option>
          {operators.map((o) => (
            <option key={o.id} value={o.id}>{o.fullName}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={apply}
          className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
        >
          Apply
        </button>
        <button
          onClick={reset}
          className="h-10 px-4 border border-border rounded-lg text-sm"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
