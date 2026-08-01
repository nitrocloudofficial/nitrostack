"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

type Tone = "neutral" | "success" | "warning" | "destructive";

interface TrendProps {
  direction: "up" | "down" | "flat";
  value: string;
  tone?: Tone;
}

export interface MetricCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  trend?: TrendProps;
  hint?: string;
  tone?: Tone;
}

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

const TONE_ICON: Record<Tone, string> = {
  neutral: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export default function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  hint,
  tone = "neutral",
}: MetricCardProps) {
  const TrendIcon =
    trend?.direction === "up"
      ? ArrowUpRight
      : trend?.direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition hover:border-ring/50">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {Icon ? (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted ${TONE_ICON[tone]}`}
          >
            <Icon size={16} />
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <p
          className={`text-3xl font-bold tabular-nums ${TONE_TEXT[tone]}`}
          aria-label={`${title}: ${value}`}
        >
          {value}
        </p>

        {trend ? (
          <p className="mt-1 flex items-center gap-1 text-sm">
            <TrendIcon
              size={14}
              aria-hidden="true"
              className={TONE_ICON[trend.tone ?? "neutral"]}
            />
            <span
              className={`font-medium tabular-nums ${TONE_TEXT[trend.tone ?? "neutral"]}`}
            >
              {trend.value}
            </span>
          </p>
        ) : null}

        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
