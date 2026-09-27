"use client";

import { useState } from "react";
import { useFetch } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Droplets, Factory, RefreshCw, Trash2 } from "lucide-react";

interface WasteStream {
  name: string;
  category: string;
  physicalForm?: string;
  volume: number;
  maxVolume?: number;
  contamination: string;
  reusePotential: number;
  seasonalVariation?: string;
}

interface FactoryProfile {
  factoryId: string;
  factoryName: string;
  industryType: string;
  wasteStreams: WasteStream[];
}

interface WasteProfilesResponse {
  profiles: FactoryProfile[];
}

const contaminationConfig: Record<string, { color: string; bg: string; label: string }> = {
  hazardous: { color: "text-red-400", bg: "bg-red-500", label: "Hazardous" },
  high: { color: "text-red-400", bg: "bg-red-400", label: "High" },
  mild: { color: "text-amber-400", bg: "bg-amber-400", label: "Mild" },
  clean: { color: "text-emerald-400", bg: "bg-emerald-400", label: "Clean" },
};

function getContamination(level: string) {
  return contaminationConfig[level?.toLowerCase()] ?? {
    color: "text-zinc-400",
    bg: "bg-zinc-500",
    label: level || "Unknown",
  };
}

export default function WasteProfilesPage() {
  const { data, loading, error, refetch } = useFetch<WasteProfilesResponse>("/api/waste-profiles");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const factories = data?.profiles ?? [];
  const selected = selectedId ? factories.find((f) => f.factoryId === selectedId) : factories[0];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Waste Profiles</h1>
        <p className="text-sm text-zinc-500">Factory waste streams, contamination levels, and reuse potential.</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        <div className="lg:w-64 flex-shrink-0">
          <Card className="overflow-hidden border-zinc-800 bg-zinc-950/60">
            <div className="px-4 py-3 border-b border-zinc-800">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
                Select Factory
              </span>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {factories.map((f) => {
                const isActive = (selected?.factoryId ?? factories[0]?.factoryId) === f.factoryId;
                return (
                  <button
                    key={f.factoryId}
                    onClick={() => setSelectedId(f.factoryId)}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2.5 transition-all duration-100 border-l-2 ${
                      isActive
                        ? "bg-zinc-800/50 text-zinc-100 border-emerald-500"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20 border-transparent"
                    }`}
                  >
                    <Factory className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-emerald-400" : ""}`} />
                    <span className="truncate text-[13px]">{f.factoryName}</span>
                    <span className="ml-auto text-[11px] text-zinc-600 font-mono">
                      {f.wasteStreams?.length ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-zinc-100">{selected.factoryName}</h2>
                  <p className="text-xs text-zinc-500">{selected.industryType}</p>
                </div>
                <span className="text-xs text-zinc-500">
                  {(selected.wasteStreams ?? []).length} waste streams
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(selected.wasteStreams ?? []).map((ws, i) => {
                  const contam = getContamination(ws.contamination);
                  const reusePct = Math.max(0, Math.min(100, Math.round(ws.reusePotential ?? 0)));
                  const volumePct = ws.maxVolume ? Math.min(100, (ws.volume / ws.maxVolume) * 100) : 100;

                  return (
                    <Card key={`${selected.factoryId}-${ws.name}-${i}`} className="border-zinc-800 bg-zinc-950/60 transition-colors hover:border-zinc-700">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-sm font-medium text-zinc-200">{ws.name}</CardTitle>
                          <span className="rounded-full border border-zinc-700/50 bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                            {ws.category}
                          </span>
                        </div>
                        {ws.physicalForm && (
                          <p className="text-xs capitalize text-zinc-500">{ws.physicalForm}</p>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-3 p-4 pt-2">
                        <ProgressRow
                          icon={Droplets}
                          label="Volume"
                          value={`${ws.volume} kg/day`}
                          percentage={volumePct}
                          barColor="bg-blue-500"
                        />

                        <ProgressRow
                          icon={RefreshCw}
                          label="Reuse Potential"
                          value={`${reusePct}%`}
                          percentage={reusePct}
                          barColor={reusePct >= 70 ? "bg-emerald-500" : reusePct >= 40 ? "bg-amber-500" : "bg-red-500"}
                        />

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className={`w-3 h-3 ${contam.color}`} />
                            <span className="text-xs text-zinc-500">Contamination</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${contam.bg}`} />
                            <span className={`text-xs font-medium capitalize ${contam.color}`}>
                              {contam.label}
                            </span>
                          </div>
                        </div>

                        {ws.seasonalVariation && (
                          <p className="text-[11px] text-zinc-600 pt-1 border-t border-zinc-800/50">
                            Seasonal: {ws.seasonalVariation}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {(selected.wasteStreams ?? []).length === 0 && (
                <EmptyState icon={Trash2} title="No waste streams recorded" />
              )}
            </div>
          ) : (
            <EmptyState icon={Factory} title="Select a factory" description="Choose a factory from the list to view its waste profile" />
          )}
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-zinc-800" />
        <Skeleton className="h-4 w-96 max-w-full bg-zinc-800" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-44 bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-lg border border-red-900/50 bg-red-950/10 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-red-400" />
      <div>
        <h2 className="text-base font-medium text-zinc-100">Unable to load waste profiles</h2>
        <p className="mt-1 text-sm text-zinc-500">{message}</p>
      </div>
      <Button onClick={onRetry} variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 p-8 text-center">
      <Icon className="h-8 w-8 text-zinc-500" />
      <h2 className="mt-3 text-base font-medium text-zinc-100">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
    </div>
  );
}

function ProgressRow({
  icon: Icon,
  label,
  value,
  percentage,
  barColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  percentage: number;
  barColor: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <Icon className="w-3 h-3" />
          {label}
        </span>
        <span className="text-xs text-zinc-400 font-mono">{value}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
