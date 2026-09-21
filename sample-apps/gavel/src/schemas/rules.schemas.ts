import { z } from "zod";

export const ConditionSchema = z.object({
  field: z.string().describe("Target field path in ProjectProfile (e.g., 'framework', 'projectType', 'hasAnimationLibrary')"),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains"]).describe("Comparison operator"),
  value: z.union([z.string(), z.number(), z.boolean()]).describe("Expected value for condition match"),
});
export type Condition = z.infer<typeof ConditionSchema>;

export const RuleSchema = z.object({
  id: z.string().describe("Unique rule identifier (e.g., 'rule-framer-motion-01')"),
  name: z.string().describe("Human-readable rule title"),
  category: z.string().describe("Category of UI enhancement (e.g., 'animation', 'smooth-scroll', '3d')"),
  conditions: z.array(ConditionSchema).describe("List of conditions that must evaluate true"),
  recommendation: z.object({
    library: z.string().describe("Target library name"),
    title: z.string().describe("Recommendation title"),
    implementationHint: z.string().describe("Brief technical hint for developer/agent"),
  }),
  priority: z.enum(["low", "medium", "high"]).describe("Rule priority level"),
  reasoningTemplate: z.string().describe("Template string for reasoning generation"),
  rejectionReason: z.string().describe("Explicit reason if rule conditions fail"),
});
export type Rule = z.infer<typeof RuleSchema>;
