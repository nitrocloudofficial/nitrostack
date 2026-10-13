// src/widgets/components/rakshanet/EmergencyActions.tsx
"use client";

import { motion } from "framer-motion";
import {
  MessageSquare,
  MessageCircle,
  PhoneCall,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Communication, CommunicationChannelResult } from "../../lib/types";

interface EmergencyActionsProps {
  communication: Communication;
}

const CHANNELS: {
  key: keyof Pick<Communication, "sms" | "whatsapp" | "fakeCall">;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "sms", label: "SMS", icon: <MessageSquare className="h-5 w-5" /> },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: <MessageCircle className="h-5 w-5" />,
  },
  { key: "fakeCall", label: "Fake Call", icon: <PhoneCall className="h-5 w-5" /> },
];

export function EmergencyActions({ communication }: EmergencyActionsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {CHANNELS.map((channel, i) => {
        const result = communication[channel.key];
        return (
          <motion.div
            key={channel.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
          >
            <ActionCard label={channel.label} icon={channel.icon} result={result} />
          </motion.div>
        );
      })}
    </div>
  );
}

function ActionCard({
  label,
  icon,
  result,
}: {
  label: string;
  icon: React.ReactNode;
  result: CommunicationChannelResult | null;
}) {
  const executed = Boolean(result);
  const success = result?.success ?? false;

  return (
    <div className="h-full rounded-2xl border border-slate-800 bg-[#1E293B]/80 p-5 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6]">
              {icon}
            </span>
            <span className="font-medium">{label}</span>
          </div>
          {executed ? (
            success ? (
              <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
            ) : (
              <XCircle className="h-5 w-5 text-slate-600" />
            )
          ) : (
            <XCircle className="h-5 w-5 text-slate-700" />
          )}
        </div>

        {result ? (
          <div className="space-y-1.5 text-xs text-slate-400">
            <Row label="Status" value={success ? "Success" : "Not triggered"} />
            <Row label="Provider" value={result.provider} />
            <Row label="Recipient" value={result.recipient} />
            <Row
              label="Timestamp"
              value={new Date(result.timestamp).toLocaleTimeString()}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-500">No action recorded.</p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-300">{value}</span>
    </div>
  );
}
