// ============================================================================
// Project Aegis — Zod Validation Schemas
// Strict runtime validation boundaries for all MCP tool inputs and outputs.
// Every tool endpoint is protected by these schemas to ensure type safety
// across the agent ↔ server boundary.
// ============================================================================

import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────────
// Shared Primitives
// ──────────────────────────────────────────────────────────────────────────────

/** A 4-element numeric tuple representing the telemetry vector. */
export const TelemetryVectorSchema = z.tuple([
  z.number().describe('Queue Depth — pending requests in the ingress queue'),
  z.number().describe('Thread Occupancy — percentage of active worker threads'),
  z.number().describe('DB Saturation — connection pool utilization (0–100)'),
  z.number().describe('Retry Rate — retry attempts per second'),
]);

export const BottleneckSignatureSchema = z.enum([
  'THUNDERING_HERD',
  'DUPLICATE_STORM',
  'DOWNSTREAM_TIMEOUT',
  'NOMINAL',
]);

export const PatchStatusSchema = z.enum([
  'PROPOSED',
  'VERIFIED',
  'APPROVED',
  'APPLIED',
  'REJECTED',
]);

// ──────────────────────────────────────────────────────────────────────────────
// Tool Input Schemas
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Input for `inject_salary_day_surge` tool.
 * Triggers a simulated thundering herd on the mock core banking service.
 */
export const InjectSurgeInputSchema = z.object({
  intensity: z
    .number()
    .min(1)
    .max(100)
    .describe('Surge intensity multiplier (1x = nominal, 100x = catastrophic)'),
  durationMs: z
    .number()
    .int()
    .min(1000)
    .max(60000)
    .describe('Duration of the surge in milliseconds (1s – 60s)'),
});
export type InjectSurgeInput = z.infer<typeof InjectSurgeInputSchema>;

/**
 * Input for `classify_bottleneck_signature` tool.
 * Optionally accepts a manual telemetry snapshot; otherwise reads live data.
 */
export const ClassifyBottleneckInputSchema = z.object({
  telemetrySnapshot: TelemetryVectorSchema
    .optional()
    .describe('Optional manual telemetry vector. If omitted, live telemetry is used.'),
});
export type ClassifyBottleneckInput = z.infer<typeof ClassifyBottleneckInputSchema>;

/**
 * Input for `verify_remediation_diff` tool.
 * Specifies the pattern to benchmark in the shadow environment.
 */
export const VerifyRemediationInputSchema = z.object({
  patchId: z
    .string()
    .uuid()
    .describe('The unique patch identifier to verify'),
  shadowDurationMs: z
    .number()
    .int()
    .min(1000)
    .max(30000)
    .optional()
    .default(5000)
    .describe('Duration of the shadow benchmark in milliseconds'),
});
export type VerifyRemediationInput = z.infer<typeof VerifyRemediationInputSchema>;

/**
 * Input for `apply_remediation_patch` tool.
 * Requires a valid approval token from the human sign-off process.
 */
export const ApplyPatchInputSchema = z.object({
  patchId: z
    .string()
    .uuid()
    .describe('The unique patch identifier to deploy'),
  approvalToken: z
    .string()
    .min(64)
    .max(128)
    .describe('Cryptographic approval token from the human sign-off widget'),
});
export type ApplyPatchInput = z.infer<typeof ApplyPatchInputSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Tool Output Schemas
// ──────────────────────────────────────────────────────────────────────────────

export const SubspaceAnalysisSchema = z.object({
  residualNorm: z.number(),
  isAnomaly: z.boolean(),
  threshold: z.number(),
  baselineDimensions: z.number().int(),
  capturedEnergy: z.number().min(0).max(1),
  timestamp: z.string().datetime(),
});

export const ShadowBenchmarkSchema = z.object({
  baselineRps: z.number(),
  remediatedRps: z.number(),
  baselineUpstreamCalls: z.number(),
  remediatedUpstreamCalls: z.number(),
  baselineP99Ms: z.number(),
  remediatedP99Ms: z.number(),
  zeroVariance: z.boolean(),
  benchmarkDurationMs: z.number(),
});

export const ClassifyBottleneckOutputSchema = z.object({
  signature: BottleneckSignatureSchema,
  recommendedPattern: z.string().nullable(),
  justification: z.string(),
  inputVector: TelemetryVectorSchema,
  subspaceAnalysis: SubspaceAnalysisSchema,
  dimensionDeviations: z.array(z.number()),
});

export const InjectSurgeOutputSchema = z.object({
  status: z.literal('surge_active'),
  intensity: z.number(),
  durationMs: z.number(),
  affectedMetrics: z.array(z.string()),
  currentVector: TelemetryVectorSchema,
});

export const VerifyRemediationOutputSchema = z.object({
  patchId: z.string().uuid(),
  patternId: z.string(),
  benchmark: ShadowBenchmarkSchema,
  verdict: z.enum(['PASS', 'FAIL']),
  diffPreview: z.string(),
});

export const ApplyPatchOutputSchema = z.object({
  patchId: z.string().uuid(),
  patternId: z.string(),
  status: z.literal('APPLIED'),
  appliedAt: z.string().datetime(),
  auditHash: z.string(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Resource Schemas
// ──────────────────────────────────────────────────────────────────────────────

export const TelemetryResourceSchema = z.object({
  currentVector: TelemetryVectorSchema,
  subspaceAnalysis: SubspaceAnalysisSchema.nullable(),
  isCalibrated: z.boolean(),
  baselineSize: z.number().int(),
  activePatch: z.string().uuid().nullable(),
  circuitBreakerState: z.enum(['CLOSED', 'OPEN', 'HALF_OPEN']).nullable(),
  uptimeMs: z.number(),
});
