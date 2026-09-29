import { ControllerDecorator as Controller, ToolDecorator as Tool } from "@nitrostack/core";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { CompareInputSchema, ScoredRecommendationSchema, ScoredRecommendation } from "../../schemas/recommendation.schemas.js";
import { ProjectProfile } from "../../schemas/analyzer.schemas.js";
import { RuleEngine } from "./rule-engine.js";
import { ScoringEngine, KnowledgeBaseEntry } from "./scoring-engine.js";

@Controller()
export class CompareLibrariesTool {
  private ruleEngine = new RuleEngine();
  private scoringEngine = new ScoringEngine();

  private async loadKnowledgeBase(): Promise<KnowledgeBaseEntry[]> {
    try {
      const kbPath = path.join(process.cwd(), "src", "data", "library-knowledge-base.json");
      const content = await fs.readFile(kbPath, "utf-8");
      const parsed = JSON.parse(content);
      return parsed.libraries || [];
    } catch {
      return [];
    }
  }

  @Tool({
    name: "compareLibraries",
    description: "Compares two UI/animation libraries head-to-head against project requirements.",
    inputSchema: CompareInputSchema,
    outputSchema: z.array(ScoredRecommendationSchema),
  })
  async execute(input: z.infer<typeof CompareInputSchema>): Promise<ScoredRecommendation[]> {
    const rules = await this.ruleEngine.loadDefaultRules();
    const kbEntries = await this.loadKnowledgeBase();

    const dummyProfile: ProjectProfile = {
      framework: "next",
      bundleSizeKb: 120,
      lighthouseScore: 88,
      projectType: "landing",
      hasAnimationLibrary: false,
      installedLibraries: [],
      themeTokens: {
        colors: ["#3b82f6", "#1e40af", "#93c5fd"],
        fonts: ["Inter", "sans-serif"],
      },
    };

    const targetLibs = [input.libraryA.toLowerCase(), input.libraryB.toLowerCase()];
    const filteredRules = rules.filter((r) => targetLibs.includes(r.recommendation.library.toLowerCase()));

    const results: ScoredRecommendation[] = [];

    for (const rule of filteredRules) {
      const isMatched = this.ruleEngine.evaluateCondition(rule.conditions[0], dummyProfile);
      const evalRule = {
        rule,
        conditionsMatched: isMatched ? rule.conditions.length : 1,
        totalConditions: rule.conditions.length,
        matchRatio: 1.0,
      };
      results.push(this.scoringEngine.calculateScore(evalRule, dummyProfile, kbEntries));
    }

    return results;
  }
}
