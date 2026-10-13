// src/widgets/components/rakshanet/RiskDashboard.tsx
"use client";

import { motion } from "framer-motion";
import { Gauge, TrendingUp, ListChecks } from "lucide-react";
import { useCountUp } from "../../hooks/useCountUp";
import type { AssessThreatResponse, ThreatLevel } from "../../lib/types";

const LEVEL_STYLES: Record<
  ThreatLevel,
  { text: string; bg: string; ring: string; dot: string }
> = {
  Low: {
    text: "text-[#22C55E]",
    bg: "bg-[#22C55E]/10",
    ring: "ring-[#22C55E]/30",
    dot: "bg-[#22C55E]",
  },
  Medium: {
    text: "text-yellow-400",
    bg: "bg-yellow-400/10",
    ring: "ring-yellow-400/30",
    dot: "bg-yellow-400",
  },
  High: {
    text: "text-orange-400",
    bg: "bg-orange-400/10",
    ring: "ring-orange-400/30",
    dot: "bg-orange-400",
  },
  Critical: {
    text: "text-[#EF4444]",
    bg: "bg-[#EF4444]/10",
    ring: "ring-[#EF4444]/30",
    dot: "bg-[#EF4444]",
  },
};

interface RiskDashboardProps {
  data: AssessThreatResponse;
}

export function RiskDashboard({ data }: RiskDashboardProps) {
  const animatedRisk = useCountUp(data.risk);
  const styles = LEVEL_STYLES[data.level];

  const cards = [
    {
      key: "risk",
      icon: <Gauge className="h-5 w-5" />,
      label: "Risk Score",
      content: (
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">{animatedRisk}</span>
          <span className="text-lg text-slate-500">/100</span>
        </div>
      ),
    },
    {
      key: "level",
      icon: <TrendingUp className="h-5 w-5" />,
      label: "Threat Level",
      content: (
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${styles.bg} ${styles.text}`}
          >
            <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
            <span className="text-lg font-bold">{data.level}</span>
          </span>
        </div>
      ),
    },
    {
      key: "action",
      icon: <ListChecks className="h-5 w-5" />,
      label: "Recommended Action",
      content: (
        <p className="text-sm leading-relaxed text-slate-300">
          {data.decision.action.replaceAll("_", " ")}
        </p>
      ),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
          className={`h-full rounded-2xl border border-slate-800 bg-[#1E293B]/80 p-5 shadow-lg backdrop-blur ${
            card.key === "level" ? `ring-1 ${styles.ring}` : ""
          }`}
        >
          <div className="flex flex-col gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                card.key === "level" ? styles.bg : "bg-[#8B5CF6]/10"
              } ${card.key === "level" ? styles.text : "text-[#8B5CF6]"}`}
            >
              {card.icon}
            </div>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {card.label}
            </span>
            {card.content}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
