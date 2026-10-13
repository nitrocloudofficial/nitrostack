"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Point {
  time: number;
  respiration: number;
}

interface RespirationChartProps {
  data: Point[];
}

const AXIS_TICK = { fill: "var(--chart-tick)", fontSize: 11 };
const GRID = "var(--chart-grid)";

function formatTime(value: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function RespirationChart({ data }: RespirationChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-base font-bold text-card-foreground">
          Live Respiration
        </h2>
        <p className="text-xs text-muted-foreground">
          Respiration rate over the last 30 packets
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">No history yet</p>
          <p className="text-xs text-muted-foreground/70">
            Respiration samples appear as live packets arrive.
          </p>
        </div>
      ) : (
        <div
          role="img"
          aria-label={`Respiration history chart with ${data.length} samples`}
          className="h-[240px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="var(--chart-grid)"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatTime}
                minTickGap={48}
              />
              <YAxis
                stroke="var(--chart-grid)"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                labelFormatter={(label) =>
                  `Time: ${typeof label === "number" ? formatTime(label) : label}`
                }
                formatter={(value) => [`${value} bpm`, "Respiration"]}
                contentStyle={{
                  background: "var(--tooltip-bg)",
                  border: "1px solid var(--tooltip-border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="respiration"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
