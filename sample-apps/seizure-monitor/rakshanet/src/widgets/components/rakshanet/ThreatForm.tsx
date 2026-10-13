// src/widgets/components/rakshanet/ThreatForm.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Moon,
  Lightbulb,
  Navigation2,
  Volume2,
  Phone,
  MapPin,
  Crosshair,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import type { AssessThreatInput } from "../../lib/types";

interface ThreatFormProps {
  initialValues: AssessThreatInput;
  onSubmit: (input: AssessThreatInput) => void;
  isLoading: boolean;
}

export function ThreatForm({ initialValues, onSubmit, isLoading }: ThreatFormProps) {
  const [values, setValues] = useState<AssessThreatInput>(initialValues);
  const [locating, setLocating] = useState(false);

  const update = <K extends keyof AssessThreatInput>(
    key: K,
    value: AssessThreatInput[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update("latitude", Number(position.coords.latitude.toFixed(4)));
        update("longitude", Number(position.coords.longitude.toFixed(4)));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#1E293B]/80 p-6 shadow-xl backdrop-blur sm:p-8"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#8B5CF6]/10 blur-3xl" />

      <div className="relative mb-6">
        <h3 className="flex items-center gap-2 text-xl font-semibold text-white">
          <ShieldAlert className="h-5 w-5 text-[#8B5CF6]" />
          Threat Assessment
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Provide current conditions so the AI decision engine can gauge
          your risk level.
        </p>
      </div>

      <div className="relative space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <ToggleRow
            icon={<Moon className="h-4 w-4" />}
            label="Night Time"
            checked={values.night}
            onChange={(v) => update("night", v)}
          />
          <ToggleRow
            icon={<Lightbulb className="h-4 w-4" />}
            label="Poor Lighting"
            checked={values.poorLighting}
            onChange={(v) => update("poorLighting", v)}
          />
          <ToggleRow
            icon={<Navigation2 className="h-4 w-4" />}
            label="Route Deviation"
            checked={values.routeDeviation}
            onChange={(v) => update("routeDeviation", v)}
          />
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <Volume2 className="h-4 w-4 text-[#EC4899]" />
              Audio Threat Level
            </label>
            <span className="rounded-md bg-[#EC4899]/15 px-2 py-0.5 text-xs font-medium text-[#EC4899]">
              {values.audioThreat}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={values.audioThreat}
            onChange={(e) => update("audioThreat", Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-[#EC4899]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <Phone className="h-4 w-4" />
              Guardian Phone
            </label>
            <input
              type="text"
              value={values.guardianPhone}
              onChange={(e) => update("guardianPhone", e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/30"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <MapPin className="h-4 w-4" />
              Location
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={values.latitude}
                onChange={(e) => update("latitude", Number(e.target.value))}
                placeholder="Latitude"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/30"
              />
              <input
                type="number"
                value={values.longitude}
                onChange={(e) => update("longitude", Number(e.target.value))}
                placeholder="Longitude"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/30"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="mr-2 h-4 w-4" />
          )}
          Use Current Location
        </button>

        <motion.button
          type="button"
          onClick={() => onSubmit(values)}
          disabled={isLoading}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-base font-semibold text-white shadow-lg shadow-[#8B5CF6]/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Assessing Safety...
            </>
          ) : (
            <>
              <ShieldAlert className="mr-2 h-5 w-5" />
              Assess Safety
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

function ToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <span className="text-[#8B5CF6]">{icon}</span>
        {label}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-[#8B5CF6]" : "bg-slate-700"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
          style={{ left: checked ? "22px" : "2px" }}
        />
      </button>
    </div>
  );
}
