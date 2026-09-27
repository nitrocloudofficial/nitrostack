"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Cpu,
  Gauge,
  HeartPulse,
  Radio,
  Waves,
} from "lucide-react";

import api from "@/services/api";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import CsiChart from "@/components/charts/CsiChart";
import { useWebSocket } from "@/hooks/useWebSocket";

interface MonitorData {
  packetRate: number;
  rssi: number;
  activity: string;
  respiration: number;
  confidence: number;
}

interface LiveUpdateData {
  csi: number[];
  packetRate: number;
  rssi: number;
}

interface Health {
  online: boolean;
  monitoringActive: boolean;
  websocketClients: number;
  connectedDevices: number;
  activeSessions: number;
  packetRate: number;
  uptimeSeconds: number;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ${seconds % 60}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function getSignalQuality(rssi: number) {
  if (rssi >= -40) {
    return { text: "Excellent", tone: "bg-success", width: "100%" };
  }
  if (rssi >= -55) {
    return { text: "Good", tone: "bg-success/80", width: "75%" };
  }
  if (rssi >= -70) {
    return { text: "Fair", tone: "bg-warning", width: "50%" };
  }
  return { text: "Weak", tone: "bg-destructive", width: "25%" };
}

function StatBlock({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold tabular-nums text-foreground">
          {value}
          {unit ? <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span> : null}
        </p>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  const [monitor, setMonitor] = useState<MonitorData>({
    packetRate: 0,
    rssi: 0,
    activity: "Waiting…",
    respiration: 0,
    confidence: 0,
  });

  const [health, setHealth] = useState<Health | null>(null);
  const [csiAmplitudes, setCsiAmplitudes] = useState<number[]>([]);

  const { connected } = useWebSocket<LiveUpdateData>({
    event: "LIVE_UPDATE",
    onMessage: (message) => {
      setCsiAmplitudes(message.csi ?? []);
      setMonitor((prev) => ({
        ...prev,
        packetRate: message.packetRate ?? prev.packetRate,
        rssi: message.rssi ?? prev.rssi,
      }));
    },
  });

  useEffect(() => {
    const fetchMonitor = () => {
      api
        .get("/monitor")
        .then((res) => setMonitor(res.data))
        .catch(() => undefined);
      api
        .get("/health")
        .then((res) => setHealth(res.data))
        .catch(() => undefined);
    };

    fetchMonitor();
    const timer = setInterval(fetchMonitor, 1000);
    return () => clearInterval(timer);
  }, []);

  const signal = getSignalQuality(monitor.rssi);
  const uptime = health ? formatUptime(health.uptimeSeconds) : "—";

  return (
    <main className="flex min-h-screen bg-background">
      <Sidebar />

      <section className="flex-1 min-w-0">
        <Navbar />

        <div className="p-4 sm:p-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Guardian Monitoring
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live signal and vitals from the ESP32 receiver
          </p>

          <div className="mb-6 mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? "bg-success" : "bg-destructive"
              }`}
            />
            {connected ? "Live feed connected" : "Reconnecting…"}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-6 flex items-center gap-2 text-base font-bold text-card-foreground">
                <Activity size={18} className="text-primary" aria-hidden="true" />
                Live Monitoring
              </h2>
              <div className="space-y-5">
                <StatBlock icon={Waves} label="Activity" value={monitor.activity} />
                <StatBlock
                  icon={HeartPulse}
                  label="Respiration"
                  value={String(monitor.respiration)}
                  unit="bpm"
                />
                <StatBlock
                  icon={Radio}
                  label="Packet Rate"
                  value={String(monitor.packetRate)}
                  unit="pkt/s"
                />
                <StatBlock
                  icon={Gauge}
                  label="Signal Strength"
                  value={String(monitor.rssi)}
                  unit="dBm"
                />
                <StatBlock
                  icon={Activity}
                  label="Confidence"
                  value={String(monitor.confidence)}
                  unit="%"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-6 flex items-center gap-2 text-base font-bold text-card-foreground">
                <Radio size={18} className="text-primary" aria-hidden="true" />
                Signal Quality
              </h2>
              <div
                role="img"
                aria-label={`Signal quality: ${signal.text}`}
                className="space-y-6"
              >
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${signal.tone}`}
                    style={{ width: signal.width }}
                  />
                </div>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {signal.text}
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    RSSI:{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {monitor.rssi} dBm
                    </span>
                  </p>
                  <p>
                    Packet Rate:{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {monitor.packetRate} pkt/s
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-6 flex items-center gap-2 text-base font-bold text-card-foreground">
                <Cpu size={18} className="text-primary" aria-hidden="true" />
                System Health
              </h2>
              <div className="space-y-4">
                {[
                  {
                    label: "Backend",
                    value: health?.online ? "Online" : "Offline",
                    ok: health?.online ?? false,
                  },
                  {
                    label: "Monitoring",
                    value: health?.monitoringActive ? "Active" : "Idle",
                    ok: health?.monitoringActive ?? false,
                  },
                  {
                    label: "Devices",
                    value: String(health?.connectedDevices ?? "—"),
                    ok: (health?.connectedDevices ?? 0) > 0,
                  },
                  {
                    label: "Sessions",
                    value: String(health?.activeSessions ?? "—"),
                    ok: (health?.activeSessions ?? 0) > 0,
                  },
                  {
                    label: "Uptime",
                    value: uptime,
                    ok: true,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {row.label}
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 rounded-full ${
                          row.ok ? "bg-success" : "bg-warning"
                        }`}
                      />
                      <span className="tabular-nums">{row.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <CsiChart amplitudes={csiAmplitudes} />
          </div>
        </div>
      </section>
    </main>
  );
}
