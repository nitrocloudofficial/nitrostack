import { z } from "zod";

export const MetricPointSchema = z.object({
  lighthouseScore: z.number().min(0).max(100),
  bundleSizeKb: z.number(),
  firstContentfulPaintMs: z.number().optional(),
  largestContentfulPaintMs: z.number().optional(),
});
export type MetricPoint = z.infer<typeof MetricPointSchema>;

export const BenchmarkResultSchema = z.object({
  before: MetricPointSchema.describe("Baseline metrics before changes"),
  after: MetricPointSchema.describe("Metrics after implementing recommendation"),
  delta: z.object({
    lighthouseScore: z.number().describe("Difference in Lighthouse score (after - before)"),
    bundleSizeKb: z.number().describe("Difference in bundle size in KB (after - before)"),
  }),
});
export type BenchmarkResult = z.infer<typeof BenchmarkResultSchema>;

export const LighthouseInputSchema = z.object({
  url: z.string().describe("Target URL or local dev port to audit"),
});
export type LighthouseInput = z.infer<typeof LighthouseInputSchema>;

export const CompareMetricsInputSchema = z.object({
  beforeMetrics: MetricPointSchema,
  afterMetrics: MetricPointSchema,
});
export type CompareMetricsInput = z.infer<typeof CompareMetricsInputSchema>;
