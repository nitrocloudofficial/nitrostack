import { z } from "zod";

export const ThemeTokensSchema = z.object({
  colors: z.array(z.string()).describe("Extracted color palette hex or CSS variable tokens"),
  fonts: z.array(z.string()).describe("Extracted font families"),
  spacingScale: z.array(z.number()).optional().describe("Extracted spacing scale values in pixels or rems"),
});
export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;

export const CodeInsightsSchema = z.object({
  totalComponentFiles: z.number().describe("Count of .tsx/.jsx files in src/app/components"),
  stylingApproach: z.enum(["tailwind", "css-modules", "styled-components", "plain-css", "mixed", "unknown"]).describe("Primary styling technology detected in codebase"),
  hasDesignSystem: z.boolean().describe("True if ui/ or design-system/ folder exists with 3+ components"),
  buttonVariantsDetected: z.number().describe("Number of unique button styling patterns found"),
  colorTokenConsistency: z.number().min(0).max(1).describe("Ratio of hex colors matching design tokens vs raw hex values"),
  accessibilityIssues: z.array(z.string()).describe("Specific accessibility issues detected in code"),
  existingAnimationUsage: z.array(z.string()).describe("Detected animation libraries and keyframe usages in files"),
  routeCount: z.number().describe("Number of page/route entry points detected"),
  avgComponentSizeLines: z.number().describe("Average line count across component files"),
});
export type CodeInsights = z.infer<typeof CodeInsightsSchema>;

export const IntentAnswersSchema = z.object({
  audience: z.enum(["recruiter", "clients", "technical", "general"]).describe("Target audience for the website"),
  priority: z.enum(["polish", "performance", "balanced"]).describe("Primary priority: polish vs performance"),
  visualGoal: z.enum(["smooth-scroll", "micro-interactions", "3d-showcase", "minimal"]).describe("Primary visual enhancement goal"),
  updatedAt: z.string().describe("ISO timestamp when intent was last saved"),
});
export type IntentAnswers = z.infer<typeof IntentAnswersSchema>;

export const ElicitIntentInputSchema = z.object({
  path: z.string().describe("Target project directory path"),
  audience: z.enum(["recruiter", "clients", "technical", "general"]).describe("Target audience for the website"),
  priority: z.enum(["polish", "performance", "balanced"]).describe("Primary priority: polish vs performance"),
  visualGoal: z.enum(["smooth-scroll", "micro-interactions", "3d-showcase", "minimal"]).describe("Primary visual enhancement goal"),
});
export type ElicitIntentInput = z.infer<typeof ElicitIntentInputSchema>;

export const ProjectProfileSchema = z.object({
  framework: z.enum(["react", "next", "unknown"]).describe("Detected web framework"),
  bundleSizeKb: z.number().describe("Estimated baseline bundle size in KB"),
  lighthouseScore: z.number().min(0).max(100).describe("Baseline Lighthouse score (0-100)"),
  projectType: z.enum(["portfolio", "dashboard", "ecommerce", "landing", "unknown"]).describe("Guessed project type based on route and file heuristics"),
  hasAnimationLibrary: z.boolean().describe("Whether an animation library is already installed"),
  installedLibraries: z.array(z.string()).describe("List of installed UI and animation dependencies"),
  themeTokens: ThemeTokensSchema,
  codeInsights: CodeInsightsSchema.optional().describe("Deep source-code level evidence extracted from component files"),
  intent: IntentAnswersSchema.optional().describe("User intent & preferences cached in .gavel-context"),
});
export type ProjectProfile = z.infer<typeof ProjectProfileSchema>;

export const AnalyzeProjectInputSchema = z.object({
  path: z.string().describe("Absolute or relative filesystem path to target project directory"),
});
export type AnalyzeProjectInput = z.infer<typeof AnalyzeProjectInputSchema>;
