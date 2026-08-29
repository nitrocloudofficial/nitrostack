"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface CsiChartProps {
  amplitudes: number[];
}

const AXIS_TICK = { fill: "var(--chart-tick)", fontSize: 11 };
const GRID = "var(--chart-grid)";

export default function CsiChart({ amplitudes }: CsiChartProps) {
  const data = amplitudes.map((value, index) => ({
    subcarrier: index,
    amplitude: value,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-base font-bold text-card-foreground">
          CSI Amplitude
        </h2>
        <p className="text-xs text-muted-foreground">
          Latest received packet per subcarrier
        </p>
      </div>

      {amplitudes.length === 0 ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">Waiting for CSI data…</p>
          <p className="text-xs text-muted-foreground/70">
            Amplitudes stream in once the ESP32 bridge forwards packets.
          </p>
        </div>
      ) : (
        <div
          role="img"
          aria-label={`CSI amplitude chart with ${amplitudes.length} subcarriers`}
          className="h-[240px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="subcarrier"
                stroke="var(--chart-grid)"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--chart-grid)"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--tooltip-bg)",
                  border: "1px solid var(--tooltip-border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                  fontSize: "12px",
                }}
                labelFormatter={(label) => `Subcarrier ${label}`}
                formatter={(value) => [value, "Amplitude"]}
              />
              <Line
                type="monotone"
                dataKey="amplitude"
                stroke="var(--primary)"
                strokeWidth={1.75}
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
