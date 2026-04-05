"use client";

import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/topbar";
import { Download, FileText } from "lucide-react";
import { useState } from "react";
import {
  exportLogsData,
  exportExpensesData,
  exportMaintenanceData,
} from "@/lib/actions/reports";

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditorExportPage() {
  const t = useTranslations("reports");

  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);

  async function handleExportLogs() {
    setLoadingLogs(true);
    try {
      const data = await exportLogsData();
      const csv = toCSV(data as unknown as Record<string, unknown>[]);
      downloadCSV("work-logs.csv", csv);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleExportExpenses() {
    setLoadingExpenses(true);
    try {
      const data = await exportExpensesData();
      const csv = toCSV(data as unknown as Record<string, unknown>[]);
      downloadCSV("expenses.csv", csv);
    } finally {
      setLoadingExpenses(false);
    }
  }

  async function handleExportMaintenance() {
    setLoadingMaintenance(true);
    try {
      const data = await exportMaintenanceData();
      const csv = toCSV(data as unknown as Record<string, unknown>[]);
      downloadCSV("maintenance.csv", csv);
    } finally {
      setLoadingMaintenance(false);
    }
  }

  const exports = [
    {
      label: t("exportLogs"),
      description: t("logsDescription"),
      loading: loadingLogs,
      onExport: handleExportLogs,
    },
    {
      label: t("exportExpenses"),
      description: t("expensesDescription"),
      loading: loadingExpenses,
      onExport: handleExportExpenses,
    },
    {
      label: t("exportMaintenance"),
      description: t("maintenanceDescription"),
      loading: loadingMaintenance,
      onExport: handleExportMaintenance,
    },
  ];

  return (
    <div>
      <Topbar title={t("export")} showBack />
      <div className="px-4 py-4 space-y-3">
        {exports.map((item) => (
          <div
            key={item.label}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={item.onExport}
              disabled={item.loading}
              className="flex items-center justify-center gap-2 w-full h-11 mt-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {item.loading ? t("downloading") : "Download CSV"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
