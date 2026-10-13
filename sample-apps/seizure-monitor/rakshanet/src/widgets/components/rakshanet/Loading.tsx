// src/widgets/components/rakshanet/Loading.tsx
"use client";

import { motion } from "framer-motion";
import { Loader2, ShieldAlert, RefreshCcw, Radar } from "lucide-react";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-800/60 ${className}`}
      aria-hidden
    />
  );
}

export function ResultsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-2xl border border-slate-800 bg-[#1E293B]/80 p-5"
          >
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-2xl border border-slate-800 bg-[#1E293B]/80 p-5"
          >
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-2/3" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="h-72 w-full rounded-2xl" />
    </div>
  );
}

export function LoadingSpinner({ label = "Assessing risk..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-[#8B5CF6]/30"
          animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
        <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
      </div>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EF4444]/15">
          <ShieldAlert className="h-6 w-6 text-[#EF4444]" />
        </span>
        <div>
          <p className="font-medium text-white">Assessment failed</p>
          <p className="mt-1 text-sm text-slate-400">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 bg-transparent p-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B5CF6]/10">
          <Radar className="h-6 w-6 text-[#8B5CF6]" />
        </span>
        <p className="font-medium text-slate-300">No assessment yet</p>
        <p className="max-w-xs text-sm text-slate-500">
          Fill in the form above and tap &ldquo;Assess Safety&rdquo; to see your
          real-time risk dashboard.
        </p>
      </div>
    </div>
  );
}
