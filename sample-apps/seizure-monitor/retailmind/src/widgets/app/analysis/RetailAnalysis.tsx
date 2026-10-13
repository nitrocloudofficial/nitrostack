"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import ScoreCard from "../components/ScoreCard";
import OpportunityCard from "../components/OpportunityCard";
import ReportCard from "../components/ReportCard";
import OpportunityMap from "../components/OpportunityMap";
import { useAnalysis } from "../hooks/useAnalysis";

export default function RetailAnalysis({ data }: { data?: unknown }) {
  const analysis = useAnalysis(data);

  // Links the zone cards to the map: hovering a card highlights its marker,
  // clicking one flies the map to it. Hooks stay above the early return so
  // their order is stable across renders.
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [focusedZoneId, setFocusedZoneId] = useState<string | null>(null);

  // Reached by opening /analysis directly, or after a page reload cleared the
  // stored result. Showing a prompt is the honest response — there is no data
  // to display and none may be invented.
  if (!analysis) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-900">No analysis yet</h2>
          <p className="mt-3 text-gray-500">
            Run an analysis from the home page to see a retail opportunity
            report for your business.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            Start an analysis
          </Link>
        </div>
      </main>
    );
  }

  const {
    zones,
    topZone,
    executiveSummary,
    recommendationReasons,
    risks,
    suggestions,
    budgetAssumption,
    dataAvailabilityNote,
  } = analysis;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <Header />

        <section className="py-4">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-green-600">
            Analysis Results
          </p>

          <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
            Retail Opportunity Report
          </h2>

          <p className="mt-2 text-gray-500">
            Recommended area:{" "}
            <span className="font-semibold text-gray-900">
              {topZone.zone.name}
            </span>{" "}
            — based on {zones.length} analyzed zones.
          </p>
        </section>

        {/* Shown at the top, above the scores it affected, so a degraded
            report can never be mistaken for a complete one. */}
        {dataAvailabilityNote && (
          <section className="mb-6">
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-sm font-semibold text-orange-900">
                Partial data
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-orange-800">
                {dataAvailabilityNote}
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard
            label="Opportunity Score"
            score={topZone.zone.opportunityScore}
            helperText={topZone.zone.name}
          />
          <ScoreCard
            label="Footfall Potential"
            score={topZone.trafficScore}
            helperText="Derived accessibility index"
          />
          <ScoreCard
            label="Demographic Score"
            score={topZone.zone.demographicScore}
            helperText="Target audience fit"
          />
          <ScoreCard
            label="Competition"
            score={topZone.zone.competitionScore}
            helperText={`${topZone.competitionLevel} competition`}
          />
        </section>

        <section className="mt-8">
          <OpportunityMap
            zones={zones}
            topZoneId={topZone.zone.id}
            hoveredZoneId={hoveredZoneId}
            focusedZoneId={focusedZoneId}
          />
        </section>

        <section className="mt-8">
          <h3 className="mb-1 text-xl font-semibold text-gray-900">
            All Analyzed Zones
          </h3>

          {/* States plainly that area population is a shared, catchment-level
              measurement rather than a per-zone one, so an identical figure
              across cards reads as intended rather than as a bug. */}
          <p className="mb-4 text-sm text-gray-500">
            Competition, footfall and cost pressure are measured per zone. Area
            population is measured once for the surrounding city catchment, so
            it is the same for every zone here.
          </p>

          <div className="grid gap-5 md:grid-cols-3">
            {zones.map((zoneAnalysis) => (
              <OpportunityCard
                key={zoneAnalysis.zone.id}
                analysis={zoneAnalysis}
                highlighted={zoneAnalysis.zone.id === topZone.zone.id}
                isActive={zoneAnalysis.zone.id === hoveredZoneId}
                onHoverChange={setHoveredZoneId}
                onSelect={setFocusedZoneId}
              />
            ))}
          </div>
        </section>

        {/* The budget assumption is stated in full, next to the results it
            influenced, so it can never read as measured rent data. */}
        <section className="mt-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-900">
              How budget was applied
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-amber-800">
              {budgetAssumption}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <ReportCard
            areaName={topZone.zone.name}
            executiveSummary={executiveSummary}
            reasons={recommendationReasons}
            risks={risks}
            suggestions={suggestions}
          />
        </section>
      </div>
    </main>
  );
}
