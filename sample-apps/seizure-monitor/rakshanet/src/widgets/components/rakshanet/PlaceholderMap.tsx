// src/widgets/components/rakshanet/PlaceholderMap.tsx
"use client";

import { motion } from "framer-motion";
import { ShieldCheck, HeartPulse, MapPin as MapPinIcon } from "lucide-react";
import type { SafeLocation } from "../../lib/types";

interface PlaceholderMapProps {
  latitude: number;
  longitude: number;
  locations: SafeLocation[];
}

/**
 * Visual placeholder map. Not tied to any real map provider — swap the inner
 * <div> for a Google Maps / Mapbox instance later without touching layout.
 * Pin positions are derived deterministically from lat/lng deltas so they
 * look plausible without a real projection.
 */
export function PlaceholderMap({ latitude, longitude, locations }: PlaceholderMapProps) {
  const pins = locations.slice(0, 6).map((loc, i) => {
    const dx = (loc.longitude - longitude) * 4000;
    const dy = (loc.latitude - latitude) * -4000;
    const x = 50 + Math.max(-42, Math.min(42, dx));
    const y = 50 + Math.max(-38, Math.min(38, dy));
    return { ...loc, x, y, delay: i * 0.1 };
  });

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#1E293B] to-slate-900 sm:h-96">
      {/* Grid overlay to imply a map surface */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#8B5CF6]/10 via-transparent to-[#EC4899]/10"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Current location marker */}
      <div
        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        style={{ left: "50%", top: "50%" }}
      >
        <span className="relative flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8B5CF6] opacity-60" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-[#8B5CF6] ring-2 ring-white/40" />
        </span>
        <span className="mt-1 rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-medium text-slate-300">
          You are here
        </span>
      </div>

      {pins.map((pin) => (
        <motion.div
          key={pin.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: pin.delay, ease: "easeOut" }}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
        >
          <div className="group relative flex flex-col items-center">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full shadow-lg ring-2 ring-white/20 ${
                pin.type === "police"
                  ? "bg-[#8B5CF6]"
                  : pin.type === "hospital"
                  ? "bg-[#EC4899]"
                  : "bg-orange-500"
              }`}
            >
              {pin.type === "police" ? (
                <ShieldCheck className="h-4 w-4 text-white" />
              ) : pin.type === "hospital" ? (
                <HeartPulse className="h-4 w-4 text-white" />
              ) : (
                <MapPinIcon className="h-4 w-4 text-white" />
              )}
            </span>
            <span className="mt-2 w-0 h-2 border-x-4 border-x-transparent border-t-[6px] border-t-current text-inherit" />
          </div>
        </motion.div>
      ))}

      <div className="absolute bottom-3 left-3 rounded-lg bg-slate-950/70 px-3 py-1.5 text-[10px] text-slate-400 backdrop-blur">
        Map preview — ready for live provider integration
      </div>
    </div>
  );
}
