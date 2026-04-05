"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { AssetProfitabilityRow } from "@/lib/actions/reports";

interface Props {
  data: AssetProfitabilityRow[];
}

export function ProfitabilityChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No expense data recorded yet.
      </p>
    );
  }

  const chartData = data.map((row) => ({
    name: row.vehicleName.length > 12 ? row.vehicleName.slice(0, 10) + "…" : row.vehicleName,
    costs: row.totalCosts,
    hours: row.totalEngineHours,
    costPerHour: row.costPerHour ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `Rs ${v.toLocaleString()}`}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={80}
          tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
        />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === "costs" ? [`Rs ${value.toLocaleString()}`, "Total Costs"] : [value, name]
          }
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="costs" radius={[0, 4, 4, 0]}>
          {chartData.map((_, index) => (
            <Cell
              key={index}
              fill={`hsl(${220 + index * 30}, 70%, 55%)`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
