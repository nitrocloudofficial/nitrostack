"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import api from "@/services/api";

interface Status {
  backendOnline: boolean;
  monitoringActive: boolean;
  connectedDevices: number;
  activeSessions: number;
}

type LoadState = "loading" | "error" | "ready";

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "destructive" | "neutral";
}) {
  const dot = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    neutral: "bg-muted-foreground",
  }[tone];

  return (
    <div className="flex items-center justify-between py-2">
      <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export default function SystemStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      api
        .get("/status")
        .then((res) => {
          if (cancelled) return;
          setStatus(res.data);
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
        <h2 className="text-base font-bold text-card-foreground">
          System Status
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            loadState === "ready"
              ? "bg-success/10 text-success"
              : loadState === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {loadState === "loading" ? (
            <>
              <RefreshCw size={12} className="animate-spin" />
              Checking
            </>
          ) : loadState === "error" ? (
            "Unreachable"
          ) : status?.monitoringActive ? (
            "Running"
          ) : (
            "Idle"
          )}
        </span>
      </div>

      {loadState === "loading" ? (
        <div className="space-y-3 py-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : loadState === "error" || !status ? (
        <p className="py-2 text-sm text-muted-foreground">
          Backend unavailable. Retrying automatically…
        </p>
      ) : (
        <div className="divide-y divide-border">
          <StatusRow
            label="Backend"
            value={status.backendOnline ? "Online" : "Offline"}
            tone={status.backendOnline ? "success" : "destructive"}
          />
          <StatusRow
            label="Monitoring"
            value={status.monitoringActive ? "Running" : "Stopped"}
            tone={status.monitoringActive ? "success" : "warning"}
          />
          <StatusRow
            label="Devices"
            value={String(status.connectedDevices)}
            tone="neutral"
          />
          <StatusRow
            label="Sessions"
            value={String(status.activeSessions)}
            tone="neutral"
          />
        </div>
      )}
    </div>
  );
}
