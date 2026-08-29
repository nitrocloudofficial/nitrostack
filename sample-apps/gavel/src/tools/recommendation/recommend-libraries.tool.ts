import { ControllerDecorator as Controller, ToolDecorator as Tool } from "@nitrostack/core";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { RecommendInputSchema, RecommendationResultSchema, RecommendationResult, ScoredRecommendation } from "../../schemas/recommendation.schemas.js";
import { ProjectProfile } from "../../schemas/analyzer.schemas.js";
import { RuleEngine } from "./rule-engine.js";
import { ScoringEngine, KnowledgeBaseEntry } from "./scoring-engine.js";
import { GroqService } from "../../services/groq.service.js";

@Controller()
export class RecommendLibrariesTool {
  private ruleEngine = new RuleEngine();
  private scoringEngine = new ScoringEngine();
  private groqService = new GroqService();

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

  private async getProjectProfile(projectPath: string): Promise<ProjectProfile> {
    // Basic profile fallback if analyzer service is not yet initialized in current environment
    let framework: "react" | "next" | "unknown" = "unknown";
    let installedLibraries: string[] = [];
    let hasAnimationLibrary = false;
    let bundleSizeKb = 100;
    let projectType: "portfolio" | "dashboard" | "ecommerce" | "landing" | "unknown" = "landing";

    try {
      const pkgPath = path.join(projectPath, "package.json");
      const content = await fs.readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      installedLibraries = Object.keys(deps);

      if ("next" in deps) {
        framework = "next";
      } else if ("react" in deps) {
        framework = "react";
      }

      const animLibs = ["framer-motion", "gsap", "lenis", "three", "magic-ui", "react-bits"];
      hasAnimationLibrary = installedLibraries.some((lib) => animLibs.includes(lib));
    } catch {
      // Use defaults if path cannot be read directly
    }

    return {
      framework,
      bundleSizeKb,
      lighthouseScore: 85,
      projectType,
      hasAnimationLibrary,
      installedLibraries,
      themeTokens: {
        colors: ["#3b82f6", "#1e40af", "#93c5fd"],
        fonts: ["Inter", "sans-serif"],
        spacingScale: [4, 8, 12, 16, 24, 32],
      },
    };
  }

  @Tool({
    name: "recommendLibraries",
    description: "Evaluates declarative rules against a ProjectProfile, calculates confidence scores, and returns Groq-justified recommendations along with specific rejection reasons.",
    inputSchema: RecommendInputSchema,
    outputSchema: RecommendationResultSchema,
  })
  async execute(input: z.infer<typeof RecommendInputSchema>): Promise<RecommendationResult> {
    const profile = await this.getProjectProfile(input.projectPath);
    const rules = await this.ruleEngine.loadDefaultRules();
    const kbEntries = await this.loadKnowledgeBase();

    const { matched, rejected } = this.ruleEngine.evaluateRules(profile, rules);

    const scoredList: ScoredRecommendation[] = matched.map((evalRule) =>
      this.scoringEngine.calculateScore(evalRule, profile, kbEntries)
    );

    // Sort by confidence descending
    scoredList.sort((a, b) => b.confidence - a.confidence);

    const limit = input.maxRecommendations ?? 3;
    const topPicks = scoredList.slice(0, limit);

    // Generate Groq justification for the winning recommendation
    if (topPicks.length > 0) {
      const winner = topPicks[0];
      const reasoning = await this.groqService.generateJustification(
        winner.library,
        profile.projectType,
        profile.framework,
        winner.reasoning
      );
      winner.reasoning = reasoning;
    }

    return {
      recommendations: topPicks,
      rejected,
    };
  }
}
