import {
  RegulatoryResult,
  SafetyResult,
  CombinationResult,
  GenericEquivalentResult,
  CostEstimateResult,
  MedLensReportPayload,
} from "../types";

/**
 * Convenience assembler for whatever's calling these tools (the agent):
 * takes the raw outputs of any subset of the 8 tools and shapes them into
 * the MedLensReportPayload contract the widget expects. Not itself an MCP
 * tool — the agent decides which tools to call per AGENT_INSTRUCTIONS.md,
 * then can use this to build the payload instead of hand-rolling the shape.
 */
export function buildReportPayload(input: {
  drugName: string;
  regulatory?: RegulatoryResult;
  safety?: SafetyResult;
  combination?: CombinationResult;
  generic?: GenericEquivalentResult;
  cost?: CostEstimateResult;
}): MedLensReportPayload {
  const sourcesUsed: string[] = [];
  const sections: MedLensReportPayload["sections"] = {};

  if (input.regulatory?.found) {
    sourcesUsed.push("openFDA label data");
    sections.regulatory = {
      brandName: input.regulatory.brandName,
      genericName: input.regulatory.genericName,
      manufacturer: input.regulatory.manufacturerName,
      route: input.regulatory.route,
      pharmClass: input.regulatory.pharmClassEpc,
      boxedWarning: Boolean(input.regulatory.boxedWarning),
      indicationSnippet: input.regulatory.indicationSnippet,
    };
  }

  if (input.safety?.found) {
    if (!sourcesUsed.includes("openFDA label data")) sourcesUsed.push("openFDA label data");
    if (input.safety.topAdverseReactions?.length) sourcesUsed.push("openFDA adverse event data");
    sections.safety = {
      warningsSnippet: input.safety.warningsSnippet,
      contraindicationsSnippet: input.safety.contraindicationsSnippet,
      topAdverseReactions: input.safety.topAdverseReactions,
      boxedWarningSnippet: input.safety.boxedWarningSnippet,
    };
  }

  if (input.combination) {
    sections.combination = {
      risky: input.combination.risky,
      recommendation: input.combination.recommendation,
      comparedDrug: input.combination.comparedDrug,
    };
  }

  if (input.generic?.found) {
    sourcesUsed.push("RxNorm");
    sections.generic = {
      rxcui: input.generic.rxcui,
      resolvedTTY: input.generic.resolvedTTY,
      ingredientName: input.generic.ingredientName,
      genericOptions: input.generic.genericOptions,
    };
  }

  if (input.cost) {
    if (!sourcesUsed.includes("RxNorm")) sourcesUsed.push("RxNorm");
    sections.cost = {
      costSignal: input.cost.costSignal,
      note: input.cost.note,
    };
  }

  return {
    drugName: input.drugName,
    sections,
    sourcesUsed,
  };
}
