"use client";

import dynamic from "next/dynamic";
import type { ZoneAnalysis } from "../hooks/useAnalysis";

interface OpportunityMapProps {
  zones: ZoneAnalysis[];
  topZoneId: string;
  /** Zone hovered in the card grid below; highlights the matching marker. */
  hoveredZoneId?: string | null;
  /** Zone clicked in the card grid below; the map flies to it. */
  focusedZoneId?: string | null;
}

/**
 * Leaflet touches `window` at import time, so the map is loaded client-side
 * only. Without `ssr: false` the static export build fails with
 * "window is not defined".
 */
const OpportunityMapView = dynamic(() => import("./OpportunityMapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
      Loading map…
    </div>
  ),
});

export default function OpportunityMap({
  zones,
  topZoneId,
  hoveredZoneId,
  focusedZoneId,
}: OpportunityMapProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Opportunity Map</h3>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Low
          </span>
        </div>
      </div>

      {/* z-0 keeps Leaflet's stacking contexts from painting over the rest of
          the report; the height mirrors the previous visualization. */}
      <div className="relative z-0 h-72 w-full overflow-hidden rounded-xl ring-1 ring-gray-100 sm:h-96">
        <OpportunityMapView
          zones={zones}
          topZoneId={topZoneId}
          hoveredZoneId={hoveredZoneId}
          focusedZoneId={focusedZoneId}
        />
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">
        Real zone coordinates. Click a marker for its scores, or hover a zone
        card below to locate it.
      </p>
    </div>
  );
}
