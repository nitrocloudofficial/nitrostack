"use client";

import { AlertTriangle, Bell } from "lucide-react";

type Severity = "low" | "medium" | "high";

export interface AlertProps {
  active: boolean;
  title: string;
  message: string;
  severity?: Severity;
  time?: string;
}

const SEVERITY_STYLES: Record<Severity, string> = {
  low: "border-warning/40 bg-warning/15 text-warning",
  medium: "border-destructive/40 bg-destructive/15 text-destructive",
  high: "border-destructive/60 bg-destructive/20 text-destructive",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default function AlertBanner({
  active,
  title,
  message,
  severity = "high",
  time,
}: AlertProps) {
  if (!active) return null;

  const Icon = severity === "low" ? Bell : AlertTriangle;
  const high = severity === "high";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-4 rounded-xl border p-4 shadow-sm ${
        SEVERITY_STYLES[severity]
      } ${high ? "animate-pulse" : ""}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          high ? "bg-destructive text-destructive-foreground" : "bg-transparent"
        }`}
      >
        <Icon size={18} aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold">{title}</h2>
          <span className="rounded-full border border-current px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
            {SEVERITY_LABEL[severity]}
          </span>
          {time ? (
            <span className="text-sm opacity-70 tabular-nums">{time}</span>
          ) : null}
        </div>
        <p className="mt-1 text-sm opacity-90">{message}</p>
      </div>
    </div>
  );
}
