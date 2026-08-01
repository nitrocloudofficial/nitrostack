"use client";

import { useEffect, useState } from "react";
import { useWidgetSDK } from "@nitrostack/widgets";
import {
  isAnalyzeResponse,
  loadStoredAnalysis,
  type AnalyzeResponse,
  type ZoneScore,
} from "../lib/api";
import type { Zone } from "../types/analysis";

export type CompetitionLevel = "Low" | "Medium" | "High";
export type OpportunityTier = "high" | "medium" | "low";

export interface ZoneAnalysis {
  zone: Zone;
  rank: number;
  competitionLevel: CompetitionLevel;
  trafficScore: number;
  /** Null when WorldPop was unavailable; the UI shows "Unavailable". */
  populationEstimate: number | null;
  tier: OpportunityTier;
}

export interface AnalysisSummary {
  zones: ZoneAnalysis[];
  topZone: ZoneAnalysis;
  executiveSummary: string;
  recommendationReasons: string[];
  risks: string[];
  suggestions: string[];
  /** Shown verbatim so the budget assumption is never hidden from the reader. */
  budgetAssumption: string;
  /** Shown verbatim when a data source was unavailable. Null otherwise. */
  dataAvailabilityNote: string | null;
}

function getCompetitionLevel(competitionScore: number): CompetitionLevel {
  if (competitionScore >= 70) return "Low";
  if (competitionScore >= 45) return "Medium";
  return "High";
}

function getOpportunityTier(opportunityScore: number): OpportunityTier {
  if (opportunityScore >= 80) return "high";
  if (opportunityScore >= 60) return "medium";
  return "low";
}

function toZone(score: ZoneScore, index: number): Zone {
  return {
    // The backend has no zone IDs; the name is unique within one analysis and
    // the index keeps the React key stable even if two names ever collide.
    id: `${index}-${score.name}`,
    name: score.name,
    latitude: score.lat,
    longitude: score.lng,
    opportunityScore: score.opportunityScore,
    demographicScore: score.demographicScore,
    footfallScore: score.footfallPotentialScore,
    competitionScore: score.competitionScore,
    anchorScore: score.anchorScore,
    population: score.population,
    competitorCount: score.competitorCount,
    costPressureIndex: score.costPressureIndex,
    budgetFitScore: score.budgetFitScore,
  };
}

export type CostLevel = "Low" | "Moderate" | "High";

export function getCostLevel(costPressureIndex: number): CostLevel {
  if (costPressureIndex >= 70) return "High";
  if (costPressureIndex >= 45) return "Moderate";
  return "Low";
}

function buildSummary(result: AnalyzeResponse): AnalysisSummary {
  // The backend already returns zones best-first, but sorting here keeps the
  // UI correct regardless of the order it receives.
  const ranked = [...result.zones].sort(
    (a, b) => b.opportunityScore - a.opportunityScore
  );

  const zones: ZoneAnalysis[] = ranked.map((score, index) => ({
    zone: toZone(score, index),
    rank: index + 1,
    competitionLevel: getCompetitionLevel(score.competitionScore),
    trafficScore: score.footfallPotentialScore,
    populationEstimate: score.population,
    tier: getOpportunityTier(score.opportunityScore),
  }));

  const topZone = zones[0];

  const recommendationReasons: string[] = [];
  if (topZone.zone.footfallScore >= 70) {
    recommendationReasons.push(
      `Strong footfall potential (${topZone.zone.footfallScore}/100) from the density of transit stops, schools, shops and eateries around the site.`
    );
  }
  if (topZone.zone.demographicScore >= 70) {
    recommendationReasons.push(
      `Favorable demographic profile (${topZone.zone.demographicScore}/100) across population, purchasing power and age mix.`
    );
  }
  if (topZone.zone.anchorScore >= 70) {
    recommendationReasons.push(
      `Nearby anchor points (${topZone.zone.anchorScore}/100) should drive passive discovery.`
    );
  }
  if (topZone.competitionLevel === "Low") {
    recommendationReasons.push(
      `Only ${topZone.zone.competitorCount} direct competitors nearby, leaving room for early market share capture.`
    );
  }
  if (topZone.zone.budgetFitScore >= 90) {
    recommendationReasons.push(
      `Cost pressure is ${getCostLevel(
        topZone.zone.costPressureIndex
      ).toLowerCase()} (${topZone.zone.costPressureIndex}/100) and sits within the budget you specified.`
    );
  }
  if (recommendationReasons.length === 0) {
    recommendationReasons.push(
      `Highest combined opportunity score among all ${zones.length} analyzed zones.`
    );
  }

  const risks: string[] = [];
  if (topZone.competitionLevel === "High") {
    risks.push(
      `High competition density (${topZone.zone.competitorCount} nearby competitors) may pressure pricing and customer acquisition.`
    );
  }
  if (topZone.zone.footfallScore < 60) {
    risks.push(
      `Moderate footfall potential (${topZone.zone.footfallScore}/100) may limit walk-in volume.`
    );
  }
  if (topZone.zone.anchorScore < 75) {
    risks.push(
      `Fewer nearby anchor points (${topZone.zone.anchorScore}/100) may reduce passive discovery.`
    );
  }
  if (topZone.zone.budgetFitScore < 90) {
    risks.push(
      `Cost pressure here is ${getCostLevel(
        topZone.zone.costPressureIndex
      ).toLowerCase()} (${topZone.zone.costPressureIndex}/100) relative to your budget — confirm actual rents before committing.`
    );
  }
  if (risks.length === 0) {
    risks.push(`No major risk factors identified in the current data set.`);
  }

  const suggestions = [
    `Validate footfall potential with an on-site visit before finalizing lease terms — the score reflects nearby facility density, not observed pedestrian counts.`,
    `Negotiate flexible lease terms given ${topZone.competitionLevel.toLowerCase()} competition in the area.`,
    `Consider a phased or pop-up launch to validate demand ahead of full investment.`,
  ];

  return {
    zones,
    topZone,
    executiveSummary: result.executiveSummary,
    recommendationReasons,
    risks,
    suggestions,
    budgetAssumption: result.budgetAssumption,
    dataAvailabilityNote: result.dataAvailabilityNote ?? null,
  };
}

/**
 * Supplies the analysis to render, from whichever source is actually present:
 *
 *   1. `toolOutput` — when hosted as an MCP widget, the host (NitroStudio,
 *      ChatGPT) exposes the `analyze` result through the widget SDK. The CLI
 *      widget bundle reads the same `window.openai.toolOutput`, so this one
 *      path covers both.
 *   2. sessionStorage — the standalone browser flow, where the landing-page
 *      form called the dev bridge directly.
 *
 * Returns null when neither holds a complete result, so the UI can show a
 * prompt rather than inventing data to fill the screen.
 */
/**
 * Pulls the tool output straight off the host globals.
 *
 * Hosts differ: the OpenAI Apps SDK exposes `window.openai.toolOutput`, the
 * MCP Apps spec uses `window.__MCP_APP_CONTEXT__`, and some hosts populate
 * either one AFTER the widget first paints. Reading both directly, on a short
 * poll, is what makes this work across NitroStudio and ChatGPT rather than
 * only where the SDK hook happens to fire.
 */
function readHostToolOutput(): unknown {
  if (typeof window === "undefined") return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;

  return (
    w.openai?.toolOutput ??
    w.__MCP_APP_CONTEXT__?.toolOutput ??
    w.__MCP_APP_CONTEXT__?.output ??
    null
  );
}

export function useAnalysis(propData?: unknown): AnalysisSummary | null {
  const { toolOutput } = useWidgetSDK();
  const [stored, setStored] = useState<AnalyzeResponse | null>(null);
  const [hostOutput, setHostOutput] = useState<AnalyzeResponse | null>(null);

  // sessionStorage is unavailable during SSR, so the read happens after mount.
  useEffect(() => {
    setStored(loadStoredAnalysis());
  }, []);

  // Poll briefly for host globals, because several hosts attach the tool
  // output a tick or two after the widget mounts. Stops as soon as a complete
  // result appears, and gives up after ~3s rather than polling forever.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const check = () => {
      if (cancelled) return;
      const candidate = readHostToolOutput();
      if (isAnalyzeResponse(candidate)) {
        setHostOutput(candidate);
        return;
      }
      if (++attempts < 20) setTimeout(check, 150);
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  // Priority: the prop the widget bundle injected, then whatever the SDK or
  // the host globals expose, and only then the standalone browser flow.
  const source = isAnalyzeResponse(propData)
    ? propData
    : isAnalyzeResponse(toolOutput)
      ? toolOutput
      : (hostOutput ?? stored);

  return source ? buildSummary(source) : null;
}
