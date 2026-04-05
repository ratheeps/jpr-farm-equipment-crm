"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { FarmROIRow } from "@/lib/actions/reports";

interface Props {
  data: FarmROIRow[];
}

export function FarmROIChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No farm data recorded yet.
      </p>
    );
  }

  const chartData = data.map((row) => ({
    name: row.farmName.length > 12 ? row.farmName.slice(0, 10) + "…" : row.farmName,
    roi: row.roiPct ?? 0,
    profit: row.profit,
    revenue: row.totalRevenue,
    cost: row.totalInputCost,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
        />
        <YAxis
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === "roi") return [`${value}%`, "ROI"];
            return [`Rs ${value.toLocaleString()}`, name];
          }}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
        <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.roi >= 0 ? "#16a34a" : "#dc2626"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
