// src/widgets/components/rakshanet/Hero.tsx
"use client";

import { motion } from "framer-motion";
import { Shield, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
      {/* Floating gradient blobs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#8B5CF6]/30 blur-[100px]"
        animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#EC4899]/25 blur-[100px]"
        animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mb-8 flex h-24 w-24 items-center justify-center"
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] opacity-40 blur-xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] shadow-lg shadow-[#8B5CF6]/30">
            <Shield className="h-10 w-10 text-white" strokeWidth={2} />
          </div>
          <motion.div
            className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#22C55E] shadow-md"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="bg-gradient-to-r from-white via-white to-slate-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl"
        >
          RakshaNet
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mt-4 max-w-xl text-lg text-slate-400 sm:text-xl"
        >
          AI-powered Women&apos;s Safety Assistant
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mt-3 max-w-md text-sm text-slate-500"
        >
          Real-time threat assessment, guardian alerts, and nearby safe
          locations — powered by an AI decision engine.
        </motion.p>
      </div>
    </section>
  );
}
