import { ProjectProfile } from "../../schemas/analyzer.schemas.js";
import { Rule } from "../../schemas/rules.schemas.js";
import { ScoredRecommendation } from "../../schemas/recommendation.schemas.js";
import { EvaluatedRule } from "./rule-engine.js";

export interface KnowledgeBaseEntry {
  name: string;
  category: string;
  gzippedKb: number;
  minGzippedKb: number;
  gpuAccelerated: boolean;
  treeShakeable: boolean;
  bestFor: string[];
  frameworks: string[];
  requiresTailwind: boolean;
  conflictsWith: string[];
  peerWarnings: string[];
  installCommand: string;
  docsUrl: string;
}

export class ScoringEngine {
  calculateScore(
    evaluatedRule: EvaluatedRule,
    profile: ProjectProfile,
    kbEntries?: KnowledgeBaseEntry[]
  ): ScoredRecommendation {
    const { rule, conditionsMatched, totalConditions } = evaluatedRule;

    // 1. matchStrength calculation
    const matchStrength = totalConditions > 0 ? conditionsMatched / totalConditions : 1.0;

    // Find KB entry for target library
    const kbEntry = kbEntries?.find(
      (entry) => entry.name.toLowerCase() === rule.recommendation.library.toLowerCase()
    );

    // 2. compatibility calculation
    let compatibility = 1.0;
    if (kbEntry) {
      if (kbEntry.frameworks && kbEntry.frameworks.length > 0) {
        if (!kbEntry.frameworks.includes(profile.framework)) {
          compatibility = profile.framework === "unknown" ? 0.5 : 0.0;
        }
      }

      if (kbEntry.requiresTailwind) {
        // Tailwind requirement check
        const codeInsights = (profile as Record<string, any>).codeInsights;
        const hasTailwindInCode = codeInsights?.stylingApproach === "tailwind";
        const hasTailwindInstalled = profile.installedLibraries?.some((lib) => lib.includes("tailwind"));
        if (!hasTailwindInCode && !hasTailwindInstalled) {
          compatibility = Math.max(0, compatibility - 0.2);
        }
      }
    }

    // 3. conflictPenalty calculation
    let conflictPenalty = 0.0;
    if (kbEntry && profile.installedLibraries) {
      for (const installedLib of profile.installedLibraries) {
        const lowerLib = installedLib.toLowerCase();
        if (kbEntry.conflictsWith?.some((c) => lowerLib.includes(c.toLowerCase()))) {
          conflictPenalty += 0.3;
        }
        if (kbEntry.peerWarnings?.some((w) => lowerLib.includes(w.toLowerCase()))) {
          conflictPenalty += 0.1;
        }
      }
    }
    conflictPenalty = Math.min(1.0, conflictPenalty);

    // 4. Final confidence formula
    const rawScore = (0.6 * matchStrength + 0.4 * compatibility - conflictPenalty) * 100;
    const confidence = Math.max(0, Math.min(100, Math.round(rawScore)));

    return {
      library: rule.recommendation.library,
      title: rule.recommendation.title,
      confidence,
      matchStrength: Number(matchStrength.toFixed(2)),
      compatibility: Number(compatibility.toFixed(2)),
      conflictPenalty: Number(conflictPenalty.toFixed(2)),
      reasoning: rule.reasoningTemplate,
      implementationHint: rule.recommendation.implementationHint,
    };
  }
}
