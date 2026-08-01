// src/widgets/components/rakshanet/Timeline.tsx
"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Cpu,
  MapPin,
  ShieldCheck,
  MessageCircle,
  PhoneCall,
  Check,
} from "lucide-react";
import type { AssessThreatResponse, TimelineStep } from "../../lib/types";

interface TimelineProps {
  data: AssessThreatResponse;
}

const ICONS: Record<TimelineStep["icon"], React.ReactNode> = {
  alert: <AlertTriangle className="h-4 w-4" />,
  cpu: <Cpu className="h-4 w-4" />,
  "map-pin": <MapPin className="h-4 w-4" />,
  shield: <ShieldCheck className="h-4 w-4" />,
  "message-circle": <MessageCircle className="h-4 w-4" />,
  phone: <PhoneCall className="h-4 w-4" />,
};

function buildSteps(data: AssessThreatResponse): TimelineStep[] {
  return [
    {
      id: "detected",
      label: "Threat Detected",
      description: `Sensor inputs analyzed — risk score ${data.risk}/100.`,
      status: "done",
      icon: "alert",
    },
    {
      id: "decision",
      label: "Decision Engine",
      description: `Classified as ${data.level} risk. Action: ${data.decision.action.replaceAll(
        "_",
        " "
      )}.`,
      status: "done",
      icon: "cpu",
    },
    {
      id: "locations",
      label: "Safe Locations Found",
      description: `${data.safeLocations.length} nearby safe locations identified.`,
      status: data.safeLocations.length > 0 ? "done" : "pending",
      icon: "map-pin",
    },
    {
      id: "guardian",
      label: "Guardian Notified",
      description: data.decision.notifyGuardian
        ? "Guardian contact alerted with live status."
        : "Not required at this risk level.",
      status: data.decision.notifyGuardian ? "done" : "pending",
      icon: "shield",
    },
    {
      id: "sms",
      label: "SMS Sent",
      description: data.communication.sms?.success
        ? `Delivered to ${data.communication.sms.recipient}.`
        : "Not sent.",
      status: data.communication.sms?.success ? "done" : "pending",
      icon: "message-circle",
    },
    {
      id: "fakecall",
      label: "Fake Call Triggered",
      description: data.decision.triggerFakeCall
        ? "Fake call initiated to create a safe exit."
        : "Not triggered at this risk level.",
      status: data.decision.triggerFakeCall ? "done" : "pending",
      icon: "phone",
    },
  ];
}

export function Timeline({ data }: TimelineProps) {
  const steps = buildSteps(data);

  return (
    <div className="relative pl-2">
      <div className="absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-[#8B5CF6] via-slate-700 to-transparent" />
      <ul className="space-y-6">
        {steps.map((step, i) => (
          <motion.li
            key={step.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.12, ease: "easeOut" }}
            className="relative flex items-start gap-4"
          >
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                step.status === "done"
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/20 text-[#8B5CF6]"
                  : "border-slate-700 bg-slate-900 text-slate-600"
              }`}
            >
              {step.status === "done" ? (
                <Check className="h-4 w-4" />
              ) : (
                ICONS[step.icon]
              )}
            </span>
            <div className="pt-1">
              <p
                className={`text-sm font-medium ${
                  step.status === "done" ? "text-white" : "text-slate-500"
                }`}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{step.description}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
