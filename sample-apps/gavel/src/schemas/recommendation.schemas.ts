import { z } from "zod";

export const ScoredRecommendationSchema = z.object({
  library: z.string().describe("Recommended library name"),
  title: z.string().describe("Recommendation title"),
  confidence: z.number().min(0).max(100).describe("Overall confidence score (0-100)"),
  matchStrength: z.number().describe("Fraction of matched conditions (0.0 to 1.0)"),
  compatibility: z.number().describe("Framework/bundle compatibility score (0.0 to 1.0)"),
  conflictPenalty: z.number().describe("Deduction penalty for library conflicts (0.0 to 1.0)"),
  reasoning: z.string().describe("Groq-phrased 1-sentence justification"),
  implementationHint: z.string().describe("Quick hint for the coding agent"),
});
export type ScoredRecommendation = z.infer<typeof ScoredRecommendationSchema>;

export const RejectedRecommendationSchema = z.object({
  library: z.string().describe("Library name that was rejected"),
  reason: z.string().describe("Specific rationale explaining why the library was rejected"),
});
export type RejectedRecommendation = z.infer<typeof RejectedRecommendationSchema>;

export const RecommendationResultSchema = z.object({
  recommendations: z.array(ScoredRecommendationSchema).describe("List of scored & accepted recommendations sorted by confidence"),
  rejected: z.array(RejectedRecommendationSchema).describe("List of rejected libraries with specific rationale for each"),
});
export type RecommendationResult = z.infer<typeof RecommendationResultSchema>;

export const DesignSpecSchema = z.object({
  library: z.string().describe("Selected target library"),
  colors: z.record(z.string()).describe("Selected primary, secondary, and accent hex tokens"),
  motion: z.object({
    durationMs: z.number().describe("Recommended animation duration in milliseconds"),
    easing: z.string().describe("Recommended cubic-bezier or preset easing curve"),
  }),
  targetFiles: z.array(z.string()).describe("List of target components/files where library should be applied"),
  codeSnippet: z.string().describe("Starter code snippet implementing the design spec"),
});
export type DesignSpec = z.infer<typeof DesignSpecSchema>;

export const RecommendInputSchema = z.object({
  projectPath: z.string().describe("Path to target project repository"),
  maxRecommendations: z.number().optional().default(3).describe("Maximum number of recommendations to return"),
});
export type RecommendInput = z.infer<typeof RecommendInputSchema>;

export const CompareInputSchema = z.object({
  libraryA: z.string().describe("First library to compare"),
  libraryB: z.string().describe("Second library to compare"),
  projectPath: z.string().describe("Path to target project repository"),
});
export type CompareInput = z.infer<typeof CompareInputSchema>;

export const EstimateInputSchema = z.object({
  library: z.string().describe("Target library name"),
  treeShaken: z.boolean().optional().default(true).describe("Whether tree-shaking is enabled"),
});
export type EstimateInput = z.infer<typeof EstimateInputSchema>;

export const BundleImpactSchema = z.object({
  library: z.string(),
  minImpactKb: z.number(),
  maxImpactKb: z.number(),
  gzippedKb: z.number(),
  recommendation: z.string(),
});
export type BundleImpact = z.infer<typeof BundleImpactSchema>;

export const DesignSpecInputSchema = z.object({
  projectPath: z.string().describe("Path to target project repository"),
  selectedLibrary: z.string().optional().describe("Optional library override"),
});
export type DesignSpecInput = z.infer<typeof DesignSpecInputSchema>;
