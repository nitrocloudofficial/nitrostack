import { z } from 'zod';

/**
 * Session Schema Definitions
 *
 * Centralized Zod schemas for all session data types.
 * Ensures type safety and validation across all modules.
 */

// ========== Base Types ==========

export const PaperSchema = z.object({
  paperId: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  year: z.number().int(),
  venue: z.string().optional(),
  abstract: z.string().optional(),
  doi: z.string().optional(),
  url: z.string().url().optional(),
  citationCount: z.number().int().default(0),
  quartile: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'unknown']).default('unknown'),
  fieldsOfStudy: z.array(z.string()).default([]),
  pdfUrl: z.string().url().optional().nullable(),
  isOpenAccess: z.boolean().default(false),
  extractedAt: z.string().datetime().optional(),
});

export type Paper = z.infer<typeof PaperSchema>;

export const RepoSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  description: z.string().optional().nullable(),
  stars: z.number().int().default(0),
  language: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
  relevanceScore: z.number().min(0).max(100).optional(),
});

export type Repo = z.infer<typeof RepoSchema>;

export const PriorSessionSchema = z.object({
  sessionId: z.string(),
  topic: z.string(),
  verdict: z.enum(['PASS', 'CONDITIONAL', 'REJECT']).optional(),
  resilienceScore: z.number().min(0).max(100).optional(),
  createdAt: z.string().datetime(),
});

export type PriorSession = z.infer<typeof PriorSessionSchema>;

// ========== Extraction Types ==========

export const ClaimSchema = z.object({
  claimId: z.string(),
  paperId: z.string(),
  text: z.string(),
  type: z.enum(['finding', 'method', 'limitation', 'assumption', 'hypothesis', 'result']),
  confidence: z.number().min(0).max(100).default(50),
  evidence: z.string().optional(),
  extractedAt: z.string().datetime(),
});

export type Claim = z.infer<typeof ClaimSchema>;

export const MethodologySchema = z.object({
  methodologyId: z.string(),
  paperId: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['experimental', 'theoretical', 'simulation', 'survey', 'literature-review', 'other']),
  keyComponents: z.array(z.string()).default([]),
  datasets: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
  extractedAt: z.string().datetime(),
});

export type Methodology = z.infer<typeof MethodologySchema>;

export const DatasetSchema = z.object({
  datasetId: z.string(),
  paperId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  size: z.string().optional(),
  domain: z.string().optional(),
  url: z.string().url().optional(),
});

export type Dataset = z.infer<typeof DatasetSchema>;

export const MetricSchema = z.object({
  metricId: z.string(),
  paperId: z.string(),
  name: z.string(),
  value: z.union([z.string(), z.number()]).optional(),
  unit: z.string().optional(),
  baseline: z.string().optional(),
});

export type Metric = z.infer<typeof MetricSchema>;

export const TechnicalParamsSchema = z.object({
  paramsId: z.string(),
  paperId: z.string(),
  sensors: z.array(z.string()).default([]),
  samplingRateHz: z.number().optional(),
  datasetSize: z.number().optional(),
  hardwarePlatform: z.string().optional(),
  powerBudgetMw: z.number().optional(),
  latencyMs: z.number().optional(),
  throughput: z.string().optional(),
  other: z.record(z.unknown()).default({}),
  extractedAt: z.string().datetime(),
});

export type TechnicalParams = z.infer<typeof TechnicalParamsSchema>;

// ========== Synthesis Types ==========

export const ClusterSchema = z.object({
  clusterId: z.string(),
  label: z.string(),
  paperIds: z.array(z.string()),
  centroid: z.array(z.number()).optional(), // embedding vector
  summary: z.string().optional(),
  keyThemes: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});

export type Cluster = z.infer<typeof ClusterSchema>;

export const ContradictionSchema = z.object({
  contradictionId: z.string(),
  claimA: ClaimSchema,
  claimB: ClaimSchema,
  explanation: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  detectedAt: z.string().datetime(),
});

export type Contradiction = z.infer<typeof ContradictionSchema>;

// ========== Gap Types ==========

export const ResearchGapSchema = z.object({
  gapId: z.string(),
  claim: z.string(),                          // The proposed gap statement
  evidence: z.array(z.string()),              // Supporting paper IDs / text
  noveltyScore: z.number().min(0).max(100),
  feasibility: z.number().min(0).max(100),
  impact: z.number().min(0).max(100),
  relatedPapers: z.array(z.string()).default([]), // paper IDs
  status: z.enum(['proposed', 'under-review', 'passed', 'rejected']).default('proposed'),
  proposedAt: z.string().datetime(),
  reviewedAt: z.string().datetime().optional(),
  reviewIteration: z.number().int().default(0),
});

export type ResearchGap = z.infer<typeof ResearchGapSchema>;

// ========== Review Types ==========

export const ReviewResultSchema = z.object({
  reviewId: z.string(),
  gapId: z.string(),
  gapClaim: z.string(),
  paperSet: z.array(z.string()), // paper IDs searched
  adversarialSearchQuery: z.string(),
  counterEvidence: z.array(z.string()),
  verdict: z.enum(['PASS', 'OBJECTION']),
  objections: z.array(z.string()),
  objectionStrength: z.number().min(0).max(100).default(50),
  confidence: z.number().min(0).max(100).default(50),
  reviewedAt: z.string().datetime(),
  iteration: z.number().int(),
});

export type ReviewResult = z.infer<typeof ReviewResultSchema>;

// ========== Verdict Types ==========

export const VerdictSchema = z.object({
  verdictId: z.string(),
  gapId: z.string(),
  finalVerdict: z.enum(['PASS', 'CONDITIONAL', 'REJECT']),
  resilienceScore: z.number().min(0).max(100),
  objectionStrength: z.number().min(0).max(100),
  closestPriorYear: z.number().int().optional(),
  citationDensity: z.number().min(0).max(100).optional(),
  reasoning: z.string(),
  iterations: z.number().int(),
  objections: z.array(z.string()),
  decidedAt: z.string().datetime(),
});

export type Verdict = z.infer<typeof VerdictSchema>;

// ========== Analogy Types ==========

export const AnalogySchema = z.object({
  analogyId: z.string(),
  sourceDomain: z.string(),
  targetDomain: z.string(),
  sourceTechnique: z.string(),
  targetApplication: z.string(),
  similarityScore: z.number().min(0).max(100),
  transferability: z.enum(['high', 'medium', 'low']),
  verificationNotes: z.string().optional(),
  discoveredAt: z.string().datetime(),
});

export type Analogy = z.infer<typeof AnalogySchema>;

// ========== Citation Types ==========

export const CitationSchema = z.object({
  citationId: z.string(),
  paperId: z.string(),
  style: z.enum(['IEEE', 'APA', 'MLA']),
  formatted: z.string(),
  bibtex: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type Citation = z.infer<typeof CitationSchema>;

// ========== Writing Types ==========

export const WritingCheckSchema = z.object({
  checkId: z.string(),
  section: z.string(),
  originalText: z.string(),
  checkType: z.enum(['tone', 'ai-generic', 'meaning-preserved', 'clarity']),
  passed: z.boolean(),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
  checkedAt: z.string().datetime(),
});

export type WritingCheck = z.infer<typeof WritingCheckSchema>;

// ========== Verification Types ==========

export const VerificationCheckSchema = z.object({
  checkId: z.string(),
  claimId: z.string(),
  checkType: z.enum(['claim-support', 'citation-accuracy', 'methodology-consistency', 'statistical-validity']),
  passed: z.boolean(),
  detail: z.string(),
  evidence: z.array(z.string()).default([]),
  checkedAt: z.string().datetime(),
});

export type VerificationCheck = z.infer<typeof VerificationCheckSchema>;

// ========== Knowledge Graph ==========

export const KnowledgeGraphEdgeSchema = z.object({
  subject: z.string(),
  relation: z.string(),
  object: z.string(),
  weight: z.number().default(1),
  source: z.string().optional(), // paperId, claimId, etc.
  createdAt: z.string().datetime(),
});

export type KnowledgeGraphEdge = z.infer<typeof KnowledgeGraphEdgeSchema>;

// ========== Main Session Schema ==========

export const SessionSchema = z.object({
  sessionId: z.string(),
  topic: z.string(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Phase 0: Prior Work
  priorWork: z.object({
    papers: z.array(PaperSchema).default([]),
    repos: z.array(RepoSchema).default([]),
    priorSessions: z.array(PriorSessionSchema).default([]),
  }).default({ papers: [], repos: [], priorSessions: [] }),

  // Phase 1-2: Papers & Extraction
  papers: z.array(PaperSchema).default([]),
  claims: z.array(ClaimSchema).default([]),
  methodologies: z.array(MethodologySchema).default([]),
  datasets: z.array(DatasetSchema).default([]),
  metrics: z.array(MetricSchema).default([]),
  technicalParams: z.array(TechnicalParamsSchema).default([]),

  // Phase 3: Synthesis
  clusters: z.array(ClusterSchema).default([]),
  contradictions: z.array(ContradictionSchema).default([]),

  // Phase 4: Gaps
  gaps: z.array(ResearchGapSchema).default([]),

  // Phase 5: Reviews
  reviews: z.array(ReviewResultSchema).default([]),

  // Phase 6: Verdicts
  verdicts: z.array(VerdictSchema).default([]),

  // Phase 7: Analogies (stretch)
  analogies: z.array(AnalogySchema).default([]),

  // Phase 9: Citations
  citations: z.array(CitationSchema).default([]),

  // Phase 10: Writing
  writingChecks: z.array(WritingCheckSchema).default([]),

  // Phase 11: Verification
  verificationChecks: z.array(VerificationCheckSchema).default([]),

  // Phase 12: Knowledge Graph
  knowledgeGraph: z.array(KnowledgeGraphEdgeSchema).default([]),

  // Phase 13: Overleaf
  overleafProjectId: z.string().optional(),
});

export type Session = z.infer<typeof SessionSchema>;

// ========== Request/Response Types for Tools ==========

export const SearchPapersInputSchema = z.object({
  query: z.string(),
  yearFrom: z.number().int().optional(),
  yearTo: z.number().int().optional(),
  venues: z.array(z.string()).optional(),
  minCitations: z.number().int().optional(),
  limit: z.number().int().default(25),
});

export type SearchPapersInput = z.infer<typeof SearchPapersInputSchema>;

export const ScoreRelevanceInputSchema = z.object({
  paperId: z.string(),
  researchQuestion: z.string(),
});

export type ScoreRelevanceInput = z.infer<typeof ScoreRelevanceInputSchema>;

export const ExtractClaimsInputSchema = z.object({
  paperId: z.string(),
  abstract: z.string(),
  fullText: z.string().optional(),
});

export type ExtractClaimsInput = z.infer<typeof ExtractClaimsInputSchema>;

export const ClusterPapersInputSchema = z.object({
  paperIds: z.array(z.string()),
  numClusters: z.number().int().optional(),
});

export type ClusterPapersInput = z.infer<typeof ClusterPapersInputSchema>;

export const ProposeGapInputSchema = z.object({
  topic: z.string(),
  priorArtSummary: z.string(),
  clusterThemes: z.array(z.string()),
  excludedPaperIds: z.array(z.string()).optional(),
});

export type ProposeGapInput = z.infer<typeof ProposeGapInputSchema>;

export const AdversarialReviewInputSchema = z.object({
  gapClaim: z.string(),
  paperSet: z.array(z.string()),
  iteration: z.number().int(),
});

export type AdversarialReviewInput = z.infer<typeof AdversarialReviewInputSchema>;

export const ComputeResilienceScoreInputSchema = z.object({
  objectionStrength: z.number().min(0).max(100),
  closestPriorAttemptYear: z.number().int().optional(),
  citationDensity: z.number().min(0).max(100).optional(),
});

export type ComputeResilienceScoreInput = z.infer<typeof ComputeResilienceScoreInputSchema>;

export const FindAnalogsInputSchema = z.object({
  technique: z.string(),
  sourceDomain: z.string(),
  targetDomain: z.string().optional(),
  excludeDomains: z.array(z.string()).optional(),
  limit: z.number().int().default(10),
});

export type FindAnalogsInput = z.infer<typeof FindAnalogsInputSchema>;

export const GenerateCitationInputSchema = z.object({
  paperId: z.string(),
  style: z.enum(['IEEE', 'APA', 'MLA']),
});

export type GenerateCitationInput = z.infer<typeof GenerateCitationInputSchema>;

export const WritingCheckInputSchema = z.object({
  section: z.string(),
  text: z.string(),
  checkTypes: z.array(z.enum(['tone', 'ai-generic', 'meaning-preserved', 'clarity'])).default(['tone', 'ai-generic', 'clarity']),
  originalText: z.string().optional(),
});

export type WritingCheckInput = z.infer<typeof WritingCheckInputSchema>;

export const VerifyClaimInputSchema = z.object({
  claim: z.string(),
  evidence: z.array(z.string()),
});

export type VerifyClaimInput = z.infer<typeof VerifyClaimInputSchema>;