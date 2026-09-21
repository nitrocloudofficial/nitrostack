"use client";

import { useEffect, useState } from "react";
import { Cpu, Wifi, WifiOff } from "lucide-react";
import api from "@/services/api";

interface Device {
  id: string;
  name: string;
  online: boolean;
  lastSeen: string;
}

type LoadState = "loading" | "error" | "ready";

function formatLastSeen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      api
        .get("/devices")
        .then((res) => {
          if (cancelled) return;
          setDevices(Array.isArray(res.data) ? res.data : []);
          setLoadState("ready");
        })
        .catch(() => {
          if (cancelled) return;
          setLoadState("error");
        });
    };

    load();
    const timer = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-card-foreground">Devices</h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {loadState === "ready" ? devices.length : "—"}
        </span>
      </div>

      {loadState === "loading" ? (
        <div className="space-y-3 py-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : loadState === "error" ? (
        <p className="py-2 text-sm text-muted-foreground">
          Could not load devices. Retrying automatically…
        </p>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Cpu size={24} className="text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No devices connected</p>
          <p className="text-xs text-muted-foreground/70">
            Devices appear here once the ESP32 bridge connects.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {devices.map((device) => (
            <li key={device.id} className="flex items-center gap-3 py-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  device.online
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {device.online ? (
                  <Wifi size={16} aria-hidden="true" />
                ) : (
                  <WifiOff size={16} aria-hidden="true" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-card-foreground">
                  {device.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {device.id}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                    device.online
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      device.online ? "bg-success" : "bg-destructive"
                    }`}
                  />
                  {device.online ? "Online" : "Offline"}
                </span>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Seen {formatLastSeen(device.lastSeen)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
