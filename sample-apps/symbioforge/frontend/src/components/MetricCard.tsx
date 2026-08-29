"use client";
import { type LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  color: string;
  delay?: number;
}

export default function MetricCard({ label, value, unit, icon: Icon, color, delay = 0 }: MetricCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800 p-5 hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -translate-y-8 translate-x-8" style={{ background: color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight mb-1" style={{ color }}>
        {value}
        {unit && <span className="text-sm font-normal text-slate-500 ml-1.5">{unit}</span>}
      </div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}
