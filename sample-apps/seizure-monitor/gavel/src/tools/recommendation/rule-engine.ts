import * as fs from "fs/promises";
import * as path from "path";
import { ProjectProfile } from "../../schemas/analyzer.schemas.js";
import { Condition, Rule, RuleSchema } from "../../schemas/rules.schemas.js";
import { RejectedRecommendation } from "../../schemas/recommendation.schemas.js";

export interface EvaluatedRule {
  rule: Rule;
  conditionsMatched: number;
  totalConditions: number;
  matchRatio: number;
}

export class RuleEngine {
  private rulesCache: Rule[] | null = null;

  async loadDefaultRules(): Promise<Rule[]> {
    if (this.rulesCache) {
      return this.rulesCache;
    }

    const rulesDir = path.join(process.cwd(), "src", "tools", "recommendation", "rules");
    const ruleFiles = [
      "framer-motion.rule.json",
      "gsap.rule.json",
      "lenis.rule.json",
      "magic-ui.rule.json",
      "react-bits.rule.json",
      "threejs.rule.json",
    ];

    const loadedRules: Rule[] = [];

    for (const file of ruleFiles) {
      try {
        const filePath = path.join(rulesDir, file);
        const content = await fs.readFile(filePath, "utf-8");
        const parsed = JSON.parse(content);
        const validated = RuleSchema.parse(parsed);
        loadedRules.push(validated);
      } catch (error) {
        console.warn(`Failed to load or validate rule file ${file}:`, error);
      }
    }

    this.rulesCache = loadedRules;
    return loadedRules;
  }

  getNestedValue(obj: any, pathStr: string): any {
    if (!obj || typeof obj !== "object") return undefined;
    const parts = pathStr.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  evaluateCondition(condition: Condition, profile: ProjectProfile): boolean {
    const actualValue = this.getNestedValue(profile, condition.field);
    const expectedValue = condition.value;

    switch (condition.operator) {
      case "eq":
        return actualValue === expectedValue;
      case "neq":
        return actualValue !== expectedValue;
      case "gt":
        return typeof actualValue === "number" && typeof expectedValue === "number" && actualValue > expectedValue;
      case "gte":
        return typeof actualValue === "number" && typeof expectedValue === "number" && actualValue >= expectedValue;
      case "lt":
        return typeof actualValue === "number" && typeof expectedValue === "number" && actualValue < expectedValue;
      case "lte":
        return typeof actualValue === "number" && typeof expectedValue === "number" && actualValue <= expectedValue;
      case "contains":
        if (Array.isArray(actualValue)) {
          return actualValue.includes(expectedValue as string);
        }
        if (typeof actualValue === "string") {
          return actualValue.includes(String(expectedValue));
        }
        return false;
      default:
        return false;
    }
  }

  evaluateRules(
    profile: ProjectProfile,
    rules?: Rule[]
  ): {
    matched: EvaluatedRule[];
    rejected: RejectedRecommendation[];
  } {
    const rulesToEvaluate = rules || this.rulesCache || [];
    const matched: EvaluatedRule[] = [];
    const rejected: RejectedRecommendation[] = [];

    for (const rule of rulesToEvaluate) {
      const totalConditions = rule.conditions.length;
      let conditionsMatched = 0;

      for (const condition of rule.conditions) {
        if (this.evaluateCondition(condition, profile)) {
          conditionsMatched++;
        }
      }

      const isAllMatched = totalConditions > 0 && conditionsMatched === totalConditions;

      if (isAllMatched) {
        matched.push({
          rule,
          conditionsMatched,
          totalConditions,
          matchRatio: 1.0,
        });
      } else {
        rejected.push({
          library: rule.recommendation.library,
          reason: rule.rejectionReason || `Matched ${conditionsMatched}/${totalConditions} required conditions.`,
        });
      }
    }

    return { matched, rejected };
  }
}
