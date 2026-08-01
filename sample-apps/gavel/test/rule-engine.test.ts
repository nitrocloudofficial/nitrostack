import { describe, it, expect } from "vitest";
import { RuleEngine } from "../src/tools/recommendation/rule-engine.js";
import { ScoringEngine, KnowledgeBaseEntry } from "../src/tools/recommendation/scoring-engine.js";
import { GroqService } from "../src/services/groq.service.js";
import { ProjectProfile } from "../src/schemas/analyzer.schemas.js";

describe("RuleEngine Unit & Integration Tests", () => {
  const ruleEngine = new RuleEngine();

  it("should load all 6 default rule JSON files", async () => {
    const rules = await ruleEngine.loadDefaultRules();
    expect(rules).toHaveLength(6);
    expect(rules.map((r) => r.recommendation.library)).toContain("Framer Motion");
    expect(rules.map((r) => r.recommendation.library)).toContain("GSAP");
    expect(rules.map((r) => r.recommendation.library)).toContain("Lenis");
  });

  it("should correctly evaluate condition operators", () => {
    const sampleProfile: ProjectProfile = {
      framework: "next",
      bundleSizeKb: 150,
      lighthouseScore: 90,
      projectType: "landing",
      hasAnimationLibrary: false,
      installedLibraries: ["tailwindcss", "lucide-react"],
      themeTokens: { colors: ["#000000"], fonts: ["Inter"] },
    };

    expect(
      ruleEngine.evaluateCondition({ field: "framework", operator: "eq", value: "next" }, sampleProfile)
    ).toBe(true);

    expect(
      ruleEngine.evaluateCondition({ field: "framework", operator: "neq", value: "unknown" }, sampleProfile)
    ).toBe(true);

    expect(
      ruleEngine.evaluateCondition({ field: "bundleSizeKb", operator: "gt", value: 100 }, sampleProfile)
    ).toBe(true);

    expect(
      ruleEngine.evaluateCondition({ field: "bundleSizeKb", operator: "lt", value: 50 }, sampleProfile)
    ).toBe(false);

    expect(
      ruleEngine.evaluateCondition({ field: "installedLibraries", operator: "contains", value: "tailwindcss" }, sampleProfile)
    ).toBe(true);
  });

  it("should evaluate rules and match Next.js landing page rules", async () => {
    const rules = await ruleEngine.loadDefaultRules();

    const profile: ProjectProfile = {
      framework: "next",
      bundleSizeKb: 120,
      lighthouseScore: 85,
      projectType: "landing",
      hasAnimationLibrary: false,
      installedLibraries: ["next", "react"],
      themeTokens: { colors: ["#3b82f6"], fonts: ["Inter"] },
    };

    const { matched, rejected } = ruleEngine.evaluateRules(profile, rules);

    const matchedLibs = matched.map((m) => m.rule.recommendation.library);
    expect(matchedLibs).toContain("Magic UI");
    expect(matchedLibs).toContain("Lenis");
    expect(matchedLibs).toContain("Framer Motion");

    expect(rejected.some((r) => r.library === "React Bits")).toBe(true);
    expect(rejected.some((r) => r.library === "Three.js")).toBe(true);
  });
});

describe("ScoringEngine Tests", () => {
  const scoringEngine = new ScoringEngine();

  const mockKb: KnowledgeBaseEntry[] = [
    {
      name: "Framer Motion",
      category: "animation",
      gzippedKb: 50,
      minGzippedKb: 5,
      gpuAccelerated: true,
      treeShakeable: true,
      bestFor: ["Layout"],
      frameworks: ["react", "next"],
      requiresTailwind: false,
      conflictsWith: [],
      peerWarnings: ["gsap"],
      installCommand: "npm install framer-motion",
      docsUrl: "https://motion.dev/",
    },
  ];

  it("should calculate exact confidence score formula: clamp(0, 100, (0.6*match + 0.4*compat - penalty)*100)", () => {
    const profile: ProjectProfile = {
      framework: "next",
      bundleSizeKb: 100,
      lighthouseScore: 80,
      projectType: "landing",
      hasAnimationLibrary: false,
      installedLibraries: [],
      themeTokens: { colors: [], fonts: [] },
    };

    const evalRule = {
      rule: {
        id: "rule-framer-motion",
        name: "Framer Motion",
        category: "animation",
        conditions: [],
        recommendation: {
          library: "Framer Motion",
          title: "Declarative UI Motion",
          implementationHint: "Use motion.div",
        },
        priority: "high" as const,
        reasoningTemplate: "Matches layout",
        rejectionReason: "Not matched",
      },
      conditionsMatched: 3,
      totalConditions: 3,
      matchRatio: 1.0,
    };

    const result = scoringEngine.calculateScore(evalRule, profile, mockKb);
    // matchStrength=1.0, compatibility=1.0, conflictPenalty=0.0 -> (0.6*1.0 + 0.4*1.0 - 0)*100 = 100
    expect(result.confidence).toBe(100);
    expect(result.matchStrength).toBe(1.0);
    expect(result.compatibility).toBe(1.0);
    expect(result.conflictPenalty).toBe(0.0);
  });

  it("should deduct penalty if peer warning library is installed", () => {
    const profile: ProjectProfile = {
      framework: "next",
      bundleSizeKb: 100,
      lighthouseScore: 80,
      projectType: "landing",
      hasAnimationLibrary: true,
      installedLibraries: ["gsap"],
      themeTokens: { colors: [], fonts: [] },
    };

    const evalRule = {
      rule: {
        id: "rule-framer-motion",
        name: "Framer Motion",
        category: "animation",
        conditions: [],
        recommendation: {
          library: "Framer Motion",
          title: "Declarative UI Motion",
          implementationHint: "Use motion.div",
        },
        priority: "high" as const,
        reasoningTemplate: "Matches layout",
        rejectionReason: "Not matched",
      },
      conditionsMatched: 3,
      totalConditions: 3,
      matchRatio: 1.0,
    };

    const result = scoringEngine.calculateScore(evalRule, profile, mockKb);
    // matchStrength=1.0, compatibility=1.0, conflictPenalty=0.1 -> (0.6 + 0.4 - 0.1)*100 = 90
    expect(result.confidence).toBe(90);
    expect(result.conflictPenalty).toBe(0.1);
  });
});

describe("GroqService Fallback Tests", () => {
  it("should return fallback reasoning when client API key is unconfigured", async () => {
    const groq = new GroqService();
    const result = await groq.generateJustification(
      "Framer Motion",
      "landing",
      "next",
      "Fallback template reasoning"
    );
    expect(result).toBe("Fallback template reasoning");
  });
});
