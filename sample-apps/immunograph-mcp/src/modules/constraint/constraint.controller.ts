import {
  detectDuplicates,
  detectOverlaps,
  evaluateBaseHardConstraints,
  rankCandidates,
  resolveOverlaps,
} from '../../lib/algorithms/index.js';
import type {
  BaseHardConstraintInput,
  DuplicateCandidate,
  OverlapCandidate,
} from '../../lib/algorithms/index.js';
import { loadReferenceBundle } from '../../lib/database/mcp.js';
import { ToolDecorator as Tool } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';

import {
  candidateTypeSchema,
  failureExample,
  identifierSchema,
  ruleOutcomeSchema,
  sha256Schema,
  unitIntervalSchema,
} from '../common/contracts.js';
import { executeTool } from '../common/executor.js';

const duplicateCandidate = z.object({
  id: identifierSchema,
  candidateType: candidateTypeSchema,
  start: z.number().int().positive(),
  end: z.number().int().positive(),
  peptide: z.string().min(1),
  allele: identifierSchema.optional(),
  observationRefs: z.array(identifierSchema),
});
const duplicateInput = z.object({
  runId: identifierSchema,
  proteinHash: sha256Schema,
  candidates: z.array(duplicateCandidate),
});
const canonicalDuplicate = duplicateCandidate.extend({ proteinHash: sha256Schema });
const duplicateData = z.object({
  canonicalCandidates: z.array(canonicalDuplicate),
  duplicateLinks: z.array(
    z.object({
      duplicateId: identifierSchema,
      canonicalId: identifierSchema,
      edgeType: z.literal('DUPLICATE_OF'),
      ruleId: z.literal('DUPLICATE-001'),
    }),
  ),
});

const overlapCandidate = z.object({
  id: identifierSchema,
  candidateKey: identifierSchema,
  proteinHash: sha256Schema,
  candidateType: candidateTypeSchema,
  allele: identifierSchema.optional(),
  peptide: z.string().min(1),
  start: z.number().int().positive(),
  end: z.number().int().positive(),
  length: z.number().int().positive(),
  passesHardConstraints: z.boolean(),
  preliminaryScore: unitIntervalSchema,
  completeness: unitIntervalSchema,
  agreement: unitIntervalSchema,
});
const overlapInput = z.object({
  runId: identifierSchema,
  threshold: unitIntervalSchema,
  candidates: z.array(overlapCandidate),
});
const overlapData = z.object({
  pairs: z.array(
    z.object({
      leftCandidateId: identifierSchema,
      rightCandidateId: identifierSchema,
      containmentOverlap: unitIntervalSchema,
    }),
  ),
  components: z.array(z.array(identifierSchema)),
});

const bindingObservation = z.object({
  evidenceRef: identifierSchema,
  percentileRank: z.number().finite().nonnegative(),
  required: z.boolean(),
});
const baseConstraint = z.object({
  candidateId: identifierSchema,
  candidateType: candidateTypeSchema,
  peptideLength: z.number().int().positive(),
  allele: identifierSchema.optional(),
  allowedLengths: z.object({
    MHCI: z.array(z.number().int().positive()),
    MHCII: z.array(z.number().int().positive()),
  }),
  supportedAlleles: z.array(identifierSchema),
  requiredEvidenceRefs: z.array(identifierSchema),
  presentEvidenceRefs: z.array(identifierSchema),
  bindingObservations: z.array(bindingObservation),
  bindingPercentileRankMaximum: z.number().finite().positive(),
});
const thresholdsInput = z.object({
  runId: identifierSchema,
  ruleProfileVersion: identifierSchema,
  candidates: z.array(baseConstraint),
});
const constraintResult = z.object({
  candidateId: identifierSchema,
  passesAllHardConstraints: z.boolean(),
  outcomes: z.array(ruleOutcomeSchema),
});
const thresholdsData = z.object({
  ruleProfileVersion: identifierSchema,
  results: z.array(constraintResult),
});

const categoryCandidate = z.object({
  candidateId: identifierSchema,
  candidateKey: identifierSchema,
  candidateType: candidateTypeSchema,
  preliminaryScore: unitIntervalSchema,
  agreement: unitIntervalSchema,
  completeness: unitIntervalSchema,
  start: z.number().int().positive(),
  blockingReviewCondition: z.boolean(),
  ruleOutcomes: z.array(ruleOutcomeSchema),
});
const categorizeInput = z.object({
  runId: identifierSchema,
  candidates: z.array(categoryCandidate).min(1),
  thresholds: z.object({
    recommendedMinimum: unitIntervalSchema,
    reviewMinimum: unitIntervalSchema,
  }),
});
const categorizeData = z.object({
  candidates: z.array(
    z.object({
      candidateId: identifierSchema,
      category: z.enum(['RECOMMENDED', 'REVIEW', 'REJECTED']),
      confidence: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NOT_APPLICABLE']),
      blockingReviewCondition: z.boolean(),
    }),
  ),
});

const applyInput = z.object({
  runId: identifierSchema,
  snapshotHash: sha256Schema,
  ruleProfileVersion: identifierSchema,
  baseConstraints: z.array(baseConstraint),
  duplicateCandidates: z.array(duplicateCandidate.extend({ proteinHash: sha256Schema })),
  overlapCandidates: z.array(overlapCandidate),
  overlapThreshold: unitIntervalSchema,
});
const applyData = z.object({
  snapshotHash: sha256Schema,
  ruleProfileVersion: identifierSchema,
  constraintResults: z.array(constraintResult),
  duplicateLinks: duplicateData.shape.duplicateLinks,
  retainedCandidateIds: z.array(identifierSchema),
  overlapRejections: z.array(
    z.object({
      candidateId: identifierSchema,
      retainedCandidateId: identifierSchema,
      ruleId: z.literal('BIO-OVERLAP-001'),
    }),
  ),
  eligibleCandidateIds: z.array(identifierSchema),
});

const fail = (name: string) => failureExample(name);
const hash = 'a'.repeat(64);
const referenceBundle = loadReferenceBundle();
const baseExample = {
  candidateId: 'candidate-1',
  candidateType: 'MHCI' as const,
  peptideLength: 9,
  allele: 'HLA-A*02:01',
  allowedLengths: { MHCI: [9], MHCII: [15] },
  supportedAlleles: ['HLA-A*02:01'],
  requiredEvidenceRefs: ['obs-1'],
  presentEvidenceRefs: ['obs-1'],
  bindingObservations: [{ evidenceRef: 'obs-1', percentileRank: 0.5, required: true }],
  bindingPercentileRankMaximum: 2,
};
const overlapExample = {
  id: 'candidate-1',
  candidateKey: 'key-1',
  proteinHash: hash,
  candidateType: 'MHCI' as const,
  allele: 'HLA-A*02:01',
  peptide: 'ACDEFGHIK',
  start: 1,
  end: 9,
  length: 9,
  passesHardConstraints: true,
  preliminaryScore: 0.8,
  completeness: 1,
  agreement: 0.8,
};
const duplicateExample = {
  id: 'candidate-1',
  candidateType: 'MHCI' as const,
  start: 1,
  end: 9,
  peptide: 'ACDEFGHIK',
  allele: 'HLA-A*02:01',
  observationRefs: [],
};

export class ConstraintController {
  @Tool({
    name: 'detect_overlapping_epitopes',
    description:
      'Detect positional overlap competitors and connected components without resolving them.',
    inputSchema: overlapInput,
    examples: {
      request: { runId: 'example-run', threshold: 0.8, candidates: [overlapExample] },
      response: fail('detect_overlapping_epitopes'),
    },
  })
  detectOverlap(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'detect_overlapping_epitopes',
      input,
      inputSchema: overlapInput,
      dataSchema: overlapData,
      context,
      operation: (value) =>
        detectOverlaps(value.candidates.map(toOverlapCandidate), value.threshold),
    });
  }

  @Tool({
    name: 'remove_duplicate_candidates',
    description:
      'Canonicalize exact duplicate identities while preserving identical peptides at different coordinates.',
    inputSchema: duplicateInput,
    examples: {
      request: { runId: 'example-run', proteinHash: hash, candidates: [duplicateExample] },
      response: fail('remove_duplicate_candidates'),
    },
  })
  removeDuplicates(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'remove_duplicate_candidates',
      input,
      inputSchema: duplicateInput,
      dataSchema: duplicateData,
      context,
      operation: (value) =>
        detectDuplicates(
          value.candidates.map((candidate) => toDuplicateCandidate(candidate, value.proteinHash)),
        ),
    });
  }

  @Tool({
    name: 'validate_thresholds',
    description: 'Evaluate documented hard biological thresholds and emit rule outcomes.',
    inputSchema: thresholdsInput,
    examples: {
      request: { runId: 'example-run', ruleProfileVersion: 'mvp-v1.0', candidates: [baseExample] },
      response: fail('validate_thresholds'),
    },
  })
  validateThresholds(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'validate_thresholds',
      input,
      inputSchema: thresholdsInput,
      dataSchema: thresholdsData,
      context,
      operation: async (value) => {
        const bundle = await referenceBundle;
        return {
          ruleProfileVersion: value.ruleProfileVersion,
          results: value.candidates.map(({ candidateId, ...candidate }) => ({
            candidateId,
            ...evaluateBaseHardConstraints(toBaseConstraint(candidate, bundle.hlaRegistry.alleles)),
          })),
        };
      },
    });
  }

  @Tool({
    name: 'categorize_candidates',
    description:
      'Assign deterministic decision categories and confidence after scoring and constraints.',
    inputSchema: categorizeInput,
    examples: {
      request: {
        runId: 'example-run',
        thresholds: { recommendedMinimum: 0.75, reviewMinimum: 0.5 },
        candidates: [
          {
            candidateId: 'candidate-1',
            candidateKey: 'key-1',
            candidateType: 'MHCI',
            preliminaryScore: 0.8,
            agreement: 0.8,
            completeness: 1,
            start: 1,
            blockingReviewCondition: false,
            ruleOutcomes: [],
          },
        ],
      },
      response: fail('categorize_candidates'),
    },
  })
  categorize(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'categorize_candidates',
      input,
      inputSchema: categorizeInput,
      dataSchema: categorizeData,
      context,
      operation: (value) => {
        const tracks = [...new Set(value.candidates.map((candidate) => candidate.candidateType))];
        return {
          candidates: tracks.flatMap((track) =>
            rankCandidates(
              value.candidates
                .filter((candidate) => candidate.candidateType === track)
                .map((candidate) => ({
                  ...candidate,
                  finalScore: candidate.preliminaryScore,
                })),
              value.thresholds,
            ).map((candidate) => ({
              candidateId: candidate.candidateId,
              category: candidate.category,
              confidence: candidate.confidence,
              blockingReviewCondition: candidate.blockingReviewCondition,
            })),
          ),
        };
      },
    });
  }

  @Tool({
    name: 'apply_constraint_rules',
    description: 'Apply base, duplicate, and overlap rules to one immutable candidate snapshot.',
    inputSchema: applyInput,
    examples: {
      request: {
        runId: 'example-run',
        snapshotHash: hash,
        ruleProfileVersion: 'mvp-v1.0',
        baseConstraints: [baseExample],
        duplicateCandidates: [{ ...duplicateExample, proteinHash: hash }],
        overlapCandidates: [overlapExample],
        overlapThreshold: 0.8,
      },
      response: fail('apply_constraint_rules'),
    },
  })
  applyRules(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'apply_constraint_rules',
      input,
      inputSchema: applyInput,
      dataSchema: applyData,
      context,
      operation: async (value) => {
        const bundle = await referenceBundle;
        const constraintResults = value.baseConstraints.map(({ candidateId, ...candidate }) => ({
          candidateId,
          ...evaluateBaseHardConstraints(toBaseConstraint(candidate, bundle.hlaRegistry.alleles)),
        }));
        const duplicates = detectDuplicates(
          value.duplicateCandidates.map((candidate) =>
            toDuplicateCandidate(candidate, candidate.proteinHash),
          ),
        );
        const overlap = resolveOverlaps(
          value.overlapCandidates.map(toOverlapCandidate),
          value.overlapThreshold,
        );
        const canonical = new Set(duplicates.canonicalCandidates.map((candidate) => candidate.id));
        const retained = new Set(overlap.retainedCandidateIds);
        const passed = new Set(
          constraintResults
            .filter((result) => result.passesAllHardConstraints)
            .map((result) => result.candidateId),
        );
        const eligibleCandidateIds = [...canonical]
          .filter((id) => retained.has(id) && passed.has(id))
          .sort();
        return {
          snapshotHash: value.snapshotHash,
          ruleProfileVersion: value.ruleProfileVersion,
          constraintResults,
          duplicateLinks: duplicates.duplicateLinks,
          retainedCandidateIds: overlap.retainedCandidateIds,
          overlapRejections: overlap.rejections,
          eligibleCandidateIds,
        };
      },
    });
  }
}

type BaseConstraintWithoutId = Omit<z.infer<typeof baseConstraint>, 'candidateId'>;

function toBaseConstraint(
  candidate: BaseConstraintWithoutId,
  hlaAlleles: Array<{ allele: string; aliases?: string[] }>,
): BaseHardConstraintInput {
  const supportedAlleles =
    candidate.supportedAlleles.length > 0
      ? candidate.supportedAlleles
      : inferSupportedAlleles(candidate.allele, hlaAlleles);
  return { ...candidate, supportedAlleles, allele: candidate.allele } as BaseHardConstraintInput;
}

function inferSupportedAlleles(
  allele: string | undefined,
  hlaAlleles: Array<{ allele: string; aliases?: string[] }>,
): string[] {
  if (allele === undefined || allele.trim().length === 0) return [];
  const normalized = allele.trim().toLowerCase();
  const match = hlaAlleles.find(
    (entry) =>
      entry.allele.toLowerCase() === normalized ||
      (entry.aliases ?? []).some((alias) => alias.toLowerCase() === normalized),
  );
  return match === undefined ? [] : [match.allele, ...(match.aliases ?? [])];
}

function toDuplicateCandidate(
  candidate: z.infer<typeof duplicateCandidate>,
  proteinHash: string,
): DuplicateCandidate {
  const base = {
    id: candidate.id,
    proteinHash,
    candidateType: candidate.candidateType,
    start: candidate.start,
    end: candidate.end,
    peptide: candidate.peptide,
    observationRefs: candidate.observationRefs,
  };
  return candidate.allele === undefined ? base : { ...base, allele: candidate.allele };
}

function toOverlapCandidate(candidate: z.infer<typeof overlapCandidate>): OverlapCandidate {
  const { allele, ...base } = candidate;
  return allele === undefined ? base : { ...base, allele };
}
