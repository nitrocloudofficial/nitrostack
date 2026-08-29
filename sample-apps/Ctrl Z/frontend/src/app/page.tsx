"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Gauge,
  HeartPulse,
  ShieldAlert,
} from "lucide-react";

import api from "@/services/api";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import MetricCard from "@/components/cards/MetricCard";
import SystemStatus from "@/components/device/SystemStatus";
import DeviceList from "@/components/device/DeviceList";
import RespirationChart from "@/components/charts/RespirationChart";
import AlertBanner from "@/components/alerts/AlertBanner";
import CsiChart from "@/components/charts/CsiChart";
import { useWebSocket } from "@/hooks/useWebSocket";

interface LiveData {
  respiration: number;
  motion: string;
  confidence: number;
  risk: string;
}

interface LiveUpdateData extends LiveData {
  csi: number[];
  packetRate: number;
  rssi: number;
}

interface AlertData {
  active: boolean;
  title: string;
  message: string;
  severity?: "low" | "medium" | "high";
  time?: string;
}

interface HistoryPoint {
  time: number;
  respiration: number;
}

type Tone = "neutral" | "success" | "warning" | "destructive";

function riskTone(risk: string): Tone {
  const normalized = risk.toLowerCase();
  if (normalized.includes("high")) return "destructive";
  if (normalized.includes("med")) return "warning";
  return "success";
}

function confidenceTone(confidence: number): Tone {
  if (confidence >= 80) return "success";
  if (confidence >= 60) return "warning";
  return "destructive";
}

export default function Home() {
  const [live, setLive] = useState<LiveData>({
    respiration: 0,
    motion: "Waiting…",
    confidence: 0,
    risk: "Unknown",
  });

  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const [alert, setAlert] = useState<AlertData>({
    active: false,
    title: "",
    message: "",
  });

  const [csiAmplitudes, setCsiAmplitudes] = useState<number[]>([]);
  const [packetRate, setPacketRate] = useState(0);
  const [rssi, setRssi] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { connected } = useWebSocket<LiveUpdateData>({
    event: "LIVE_UPDATE",
    onMessage: (message) => {
      setLive({
        respiration: message.respiration,
        motion: message.motion,
        confidence: message.confidence,
        risk: message.risk,
      });

      setCsiAmplitudes(message.csi ?? []);
      setPacketRate(message.packetRate ?? 0);
      setRssi(message.rssi ?? 0);
      setLastUpdated(Date.now());

      setHistory((prev) => [
        ...prev.slice(-29),
        {
          time: Date.now(),
          respiration: message.respiration,
        },
      ]);

      api
        .get("/alert")
        .then((res) => setAlert(res.data))
        .catch(() => undefined);
    },
  });

  useEffect(() => {
    api
      .get("/live")
      .then((res) => setLive(res.data))
      .catch(() => undefined);
    api
      .get("/live-history")
      .then((res) => setHistory(res.data))
      .catch(() => undefined);
    api
      .get("/alert")
      .then((res) => setAlert(res.data))
      .catch(() => undefined);
  }, []);

  const stale = lastUpdated !== null && now - lastUpdated > 5000;

  return (
    <main className="flex min-h-screen bg-background">
      <Sidebar />

      <section className="flex-1 min-w-0">
        <Navbar />

        <div className="p-4 sm:p-8 sm:pb-0">
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${
                  connected ? "bg-success" : "bg-destructive"
                }`}
              />
              {connected ? "Live feed connected" : "Reconnecting…"}
            </span>
            <span className="tabular-nums">
              Packet rate:{" "}
              <span className="font-semibold text-foreground">
                {packetRate} pkt/s
              </span>
            </span>
            <span className="tabular-nums">
              RSSI:{" "}
              <span className="font-semibold text-foreground">
                {rssi} dBm
              </span>
            </span>
            {lastUpdated ? (
              <span className="tabular-nums">
                Updated{" "}
                {stale ? (
                  <span className="font-semibold text-warning">
                    {Math.round((now - lastUpdated) / 1000)}s ago
                  </span>
                ) : (
                  <span className="text-foreground">
                    {new Date(lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </span>
            ) : null}
          </div>

          <AlertBanner
            active={alert.active}
            title={alert.title}
            message={alert.message}
            severity={alert.severity}
            time={alert.time}
          />
        </div>

        <div
          aria-live="polite"
          className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-8 lg:grid-cols-4"
        >
          <MetricCard
            title="Respiration"
            value={`${live.respiration} bpm`}
            icon={HeartPulse}
            hint="Healthy range: 12–20 bpm"
          />

          <MetricCard
            title="Motion"
            value={live.motion}
            icon={Activity}
            tone={live.motion === "Waiting…" ? "neutral" : "success"}
          />

          <MetricCard
            title="Confidence"
            value={`${live.confidence}%`}
            icon={Gauge}
            tone={confidenceTone(live.confidence)}
          />

          <MetricCard
            title="Risk"
            value={live.risk}
            icon={ShieldAlert}
            tone={riskTone(live.risk)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:p-8 lg:grid-cols-2">
          <SystemStatus />
          <DeviceList />
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 pb-8 sm:p-8 lg:grid-cols-2">
          <CsiChart amplitudes={csiAmplitudes} />
          <RespirationChart data={history} />
        </div>
      </section>
    </main>
  );
}
