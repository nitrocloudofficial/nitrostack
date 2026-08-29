/** Shared shapes used across tools, orchestration notes, and the widget contract. */

export interface RegulatoryResult {
  found: boolean;
  message?: string;
  brandName?: string;
  genericName?: string;
  manufacturerName?: string;
  route?: string;
  pharmClassEpc?: string;
  boxedWarning?: boolean;
  indicationSnippet?: string;
}

export interface AdverseReactionCount {
  term: string;
  count: number;
}

export interface SafetyResult {
  found: boolean;
  warningsSnippet?: string;
  boxedWarningSnippet?: string;
  contraindicationsSnippet?: string;
  topAdverseReactions?: AdverseReactionCount[];
  eventSeriousnessNote?: string;
}

export interface CombinationResult {
  risky: boolean;
  recommendation: string;
  comparedDrug?: string;
}

export interface GenericEquivalentResult {
  found: boolean;
  rxcui?: string;
  resolvedTTY?: "SBD" | "SCD" | "GPCK" | "UNKNOWN";
  ingredientName?: string;
  genericOptions?: string[];
}

export interface CostEstimateResult {
  drug: string;
  costSignal: "brand-tier" | "generic-tier or unresolved";
  note: string;
}

export interface ConditionCandidate {
  brandName?: string;
  genericName?: string;
  pharmClass?: string;
}

export interface ConditionSearchResult {
  found: boolean;
  message?: string;
  candidates?: ConditionCandidate[];
}

export interface ScheduleEntry {
  name: string;
  timeOfDay: string;
  taken: boolean;
}

/**
 * Unified payload the agent's synthesis step should assemble before handing
 * the response to the MedLens comparison card widget. Any section may be
 * omitted — the widget renders only what's present.
 */
export interface MedLensReportPayload {
  drugName: string;
  sections: {
    regulatory?: {
      brandName?: string;
      genericName?: string;
      manufacturer?: string;
      route?: string;
      pharmClass?: string;
      boxedWarning: boolean;
      indicationSnippet?: string;
    };
    safety?: {
      warningsSnippet?: string;
      contraindicationsSnippet?: string;
      topAdverseReactions?: AdverseReactionCount[];
      boxedWarningSnippet?: string;
    };
    combination?: {
      risky: boolean;
      recommendation: string;
      comparedDrug?: string;
    };
    generic?: {
      rxcui?: string;
      resolvedTTY?: string;
      ingredientName?: string;
      genericOptions?: string[];
    };
    cost?: {
      costSignal: string;
      note: string;
    };
  };
  sourcesUsed: string[];
}
