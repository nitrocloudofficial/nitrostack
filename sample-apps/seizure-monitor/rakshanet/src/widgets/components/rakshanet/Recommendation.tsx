// src/widgets/components/rakshanet/Recommendation.tsx
"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface RecommendationProps {
  action: string;
}

export function Recommendation({ action }: RecommendationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-[#8B5CF6]/30 bg-gradient-to-br from-[#8B5CF6]/15 via-[#1E293B] to-[#EC4899]/10 p-6 shadow-xl"
    >
      <motion.div
        className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[#EC4899]/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] shadow-lg">
          <Sparkles className="h-5 w-5 text-white" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#8B5CF6]">
            AI Recommendation
          </p>
          <p className="mt-1.5 text-base leading-relaxed text-slate-200">
            {action}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
