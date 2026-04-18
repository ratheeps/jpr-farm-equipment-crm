"use client";

import { getLogsForAdmin, type AdminLogFilters } from "@/lib/actions/admin-logs";
import { Download } from "lucide-react";

export function ExportCsvButton({ filters }: { filters: AdminLogFilters }) {
  async function handleExport() {
    // Fetch all pages
    let allRows: Awaited<ReturnType<typeof getLogsForAdmin>>["rows"] = [];
    let page = 0;
    let totalCount = Infinity;
    while (allRows.length < totalCount) {
      const result = await getLogsForAdmin({ ...filters, page });
      allRows = allRows.concat(result.rows);
      totalCount = result.totalCount;
      page++;
    }
    const rows = allRows;
    const header = "Date,Vehicle,Operator,Start Hours,End Hours,Acres,Km,Fuel,Notes\n";
    const csv = header + rows.map((r) =>
      [
        r.date,
        r.vehicleName,
        r.operatorName,
        r.startEngineHours,
        r.endEngineHours ?? "",
        r.acresWorked ?? "",
        r.kmTraveled ?? "",
        r.fuelUsedLiters ?? "",
        `"${(r.notes ?? "").replace(/"/g, '""')}"`,
      ].join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 h-10 px-3 border border-border rounded-lg text-sm hover:bg-secondary"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
