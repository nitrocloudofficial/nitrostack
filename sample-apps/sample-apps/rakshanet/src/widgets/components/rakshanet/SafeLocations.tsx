// src/widgets/components/rakshanet/SafeLocations.tsx
"use client";

import { motion } from "framer-motion";
import { ShieldCheck, HeartPulse, Flame, MapPinned, Clock, ExternalLink } from "lucide-react";
import type { SafeLocation } from "../../lib/types";

interface SafeLocationsProps {
  locations: SafeLocation[];
}

const TYPE_META: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  police: {
    icon: <ShieldCheck className="h-5 w-5" />,
    label: "Police Station",
    color: "text-[#8B5CF6] bg-[#8B5CF6]/10",
  },
  hospital: {
    icon: <HeartPulse className="h-5 w-5" />,
    label: "Hospital",
    color: "text-[#EC4899] bg-[#EC4899]/10",
  },
  fire_station: {
    icon: <Flame className="h-5 w-5" />,
    label: "Fire Station",
    color: "text-orange-400 bg-orange-400/10",
  },
};

export function SafeLocations({ locations }: SafeLocationsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {locations.map((loc, i) => {
        const meta = TYPE_META[loc.type] ?? {
          icon: <MapPinned className="h-5 w-5" />,
          label: loc.type,
          color: "text-slate-300 bg-slate-700/20",
        };
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;

        return (
          <motion.div
            key={loc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
            className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800 bg-[#1E293B]/80 p-5 shadow-lg backdrop-blur transition-colors hover:border-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.color}`}
                >
                  {meta.icon}
                </span>
                <div>
                  <p className="font-medium text-white">{loc.name}</p>
                  <p className="text-xs text-slate-500">{meta.label}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <MapPinned className="h-3.5 w-3.5" />
                {loc.distance.toFixed(1)} km
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {loc.estimatedTime}
              </span>
            </div>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Open Maps
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </motion.div>
        );
      })}
    </div>
  );
}
