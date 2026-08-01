"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  CheckCircle2,
  HeartPulse,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";

import api from "@/services/api";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { useWebSocket } from "@/hooks/useWebSocket";

interface LiveData {
  respiration: number;
  motion: string;
  confidence: number;
  risk: string;
}

function getAIExplanation(live: LiveData) {
  if (live.risk === "High") {
    return {
      title: "Potential health concern detected",
      reasoning:
        "Respiration is outside the expected range. Guardian AI recommends immediate attention and closer observation.",
      recommendation:
        "Notify caregiver and continue continuous monitoring.",
    };
  }

  if (live.motion === "Walking") {
    return {
      title: "Normal walking activity detected",
      reasoning:
        "CSI signal energy indicates sustained body movement while respiration remains stable.",
      recommendation:
        "Continue monitoring. No intervention is currently required.",
    };
  }

  return {
    title: "Patient appears stationary",
    reasoning:
      "Minimal body movement detected with respiration inside the expected healthy range.",
    recommendation:
      "Continue passive monitoring. No abnormal behavior detected.",
  };
}

export default function GuardianAIPage() {
  const [live, setLive] = useState<LiveData>({
    respiration: 0,
    motion: "Waiting…",
    confidence: 0,
    risk: "Unknown",
  });

  const { connected } = useWebSocket<LiveData>({
    event: "LIVE_UPDATE",
    onMessage: (message) => {
      setLive({
        respiration: message.respiration,
        motion: message.motion,
        confidence: message.confidence,
        risk: message.risk,
      });
    },
  });

  useEffect(() => {
    api
      .get("/live")
      .then((res) => setLive(res.data))
      .catch(() => undefined);
  }, []);

  const ai = getAIExplanation(live);

  return (
    <main className="flex min-h-screen bg-background">
      <Sidebar />

      <section className="flex-1 min-w-0">
        <Navbar />

        <div className="p-4 sm:p-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Guardian AI
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time AI health assessment
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
                <Brain size={18} className="text-primary" aria-hidden="true" />
                Current Assessment
              </h2>
              <div className="space-y-5">
                {[
                  {
                    label: "Respiration",
                    value: `${live.respiration} bpm`,
                    icon: HeartPulse,
                  },
                  { label: "Motion", value: live.motion, icon: Brain },
                  {
                    label: "Confidence",
                    value: `${live.confidence}%`,
                    icon: CheckCircle2,
                  },
                  {
                    label: "Risk",
                    value: live.risk,
                    icon: ShieldAlert,
                    tone:
                      live.risk === "High"
                        ? "text-destructive"
                        : live.risk === "Medium"
                          ? "text-warning"
                          : "text-success",
                  },
                ].map(({ label, value, icon: Icon, tone }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p
                        className={`truncate text-lg font-bold tabular-nums ${tone ?? "text-foreground"}`}
                      >
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
              <h2 className="mb-6 flex items-center gap-2 text-base font-bold text-card-foreground">
                <Lightbulb size={18} className="text-primary" aria-hidden="true" />
                AI Explanation
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-primary">
                    Summary
                  </h3>
                  <p className="mt-1 text-base font-semibold leading-7 text-foreground">
                    {ai.title}
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <h3 className="text-sm font-semibold text-primary">
                    Reasoning
                  </h3>
                  <p className="mt-1 leading-7 text-muted-foreground">
                    {ai.reasoning}
                  </p>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-primary">
                    Recommendation
                  </h3>
                  <p className="mt-1 leading-7 text-muted-foreground">
                    {ai.recommendation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
