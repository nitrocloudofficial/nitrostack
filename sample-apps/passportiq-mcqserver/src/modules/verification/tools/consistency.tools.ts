/**
 * Stages 3, 4 and 7 — the cross-document comparison stages.
 *
 *   check_identity_consistency   name + date of birth, form vs every document
 *   check_address_consistency    PIN, city, state, street line
 *   visual_similarity_flag       photograph comparison (optional stage)
 *
 * The first two are one engine with two field sets (see ConsistencyService), which
 * is why they are registered from a single class: two tools that diff fields the
 * same way must not be able to disagree about what "the same" means.
 */
import { Injectable, ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import {
  ConsistencyResultSchema,
  VisualSimilarityResultSchema,
  type ConsistencyResult,
  type VisualSimilarityResult,
} from '../../../contracts/index.js';
import { PipelineEventsService } from '../../pipeline/services/pipeline-events.service.js';
import { ConsistencyService } from '../services/consistency.service.js';
import { VisualSimilarityService } from '../services/visual-similarity.service.js';
import { parse } from './document.tools.js';

const ApplicationInputSchema = z.object({
  applicationId: z.string().min(1).describe('Passport application ID'),
});

const VisualSimilarityInputSchema = z.object({
  applicationId: z.string().min(1).describe('Passport application ID whose photograph is the subject'),
  compareToApplicationId: z
    .string()
    .min(1)
    .describe(
      'A DIFFERENT application to compare against — normally one surfaced by ' +
        'detect_duplicate_signals or build_risk_graph.'
    ),
});

/**
 * @Injectable({ deps: [...] }) — MANDATORY under ESM. See document.tools.ts for
 * the full reason; order must match the constructor.
 */
@Injectable({ deps: [ConsistencyService, VisualSimilarityService, PipelineEventsService] })
export class ConsistencyVerificationTools {
  constructor(
    private readonly consistency: ConsistencyService,
    private readonly visual: VisualSimilarityService,
    private readonly events: PipelineEventsService
  ) {}

  @Tool({
    name: 'check_identity_consistency',
    title: 'Check identity consistency across documents',
    description:
      'Compare the applicant name and date of birth stated on EVERY submitted document against ' +
      'the application form and against each other. Name comparison distinguishes a genuinely ' +
      'different person from a filing convention — reordered names, an expanded initial or an ' +
      'omitted middle name are graded low rather than reported as identity conflicts, because a ' +
      'panel of false positives is what makes officers stop reading the panel. Dates of birth ' +
      'are compared exactly and are always high severity.',
    inputSchema: ApplicationInputSchema,
    outputSchema: ConsistencyResultSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Cross-checking identity fields...',
      invoked: 'Identity consistency checked',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-1001' },
      response: {
        applicationId: 'PIQ-2026-1001',
        scope: 'identity',
        consistent: false,
        mismatches: [
          {
            field: 'fullName',
            sources: { application_form: 'Rohan Kumar Sharma', aadhaar: 'Rohan Sharma' },
            similarity: 0.82,
            severity: 'low',
            detail: 'The document omits a middle name present on the form.',
          },
        ],
        worstSeverity: 'low',
      },
    },
  })
  async checkIdentityConsistency(
    rawInput: unknown,
    ctx: ExecutionContext
  ): Promise<ConsistencyResult> {
    const input = parse(ApplicationInputSchema, rawInput, 'check_identity_consistency');
    const result = this.consistency.checkIdentity(input.applicationId);

    this.events.stageCompleted(ctx, input.applicationId, 'check_identity_consistency', result);
    return result;
  }

  @Tool({
    name: 'check_address_consistency',
    title: 'Check address consistency',
    description:
      'Compare the residential address on the application form against every address-bearing ' +
      'document. PIN code is compared exactly and graded high — it is the one machine-checkable ' +
      'address field, so a difference there is a real discrepancy rather than a transcription ' +
      'variant. City, state and street line are compared with normalisation. Documents that ' +
      'state no address do not participate: a photograph carrying no address is not an ' +
      'inconsistency.',
    inputSchema: ApplicationInputSchema,
    outputSchema: ConsistencyResultSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Cross-checking the address...',
      invoked: 'Address consistency checked',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001' },
      response: {
        applicationId: 'PIQ-2026-2001',
        scope: 'address',
        consistent: true,
        mismatches: [],
        comparedFields: ['pincode', 'city', 'state', 'addressLine'],
        worstSeverity: null,
      },
    },
  })
  async checkAddressConsistency(
    rawInput: unknown,
    ctx: ExecutionContext
  ): Promise<ConsistencyResult> {
    const input = parse(ApplicationInputSchema, rawInput, 'check_address_consistency');
    const result = this.consistency.checkAddress(input.applicationId);

    this.events.stageCompleted(ctx, input.applicationId, 'check_address_consistency', result);
    return result;
  }

  @Tool({
    name: 'visual_similarity_flag',
    title: 'Flag photograph similarity between two applications',
    description:
      'ADVISORY FLAG, NOT A BIOMETRIC MATCH. Compares the photograph on two applications. When ' +
      'the two image files are byte-identical this is reported deterministically as a fact ' +
      'about the files. When they differ, the surrounding application context (shared ' +
      'identifiers, dates of birth, cluster membership) is reasoned over instead, and the ' +
      'payload states that no image comparison was performed. Optional stage — it is NOT ' +
      'required before an officer decision, and the score weights it low on purpose.',
    inputSchema: VisualSimilarityInputSchema,
    outputSchema: VisualSimilarityResultSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
    invocation: {
      invoking: 'Comparing photographs...',
      invoked: 'Similarity flag produced',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001', compareToApplicationId: 'PIQ-2026-2004' },
      response: {
        applicationId: 'PIQ-2026-2001',
        compareToApplicationId: 'PIQ-2026-2004',
        similarityFlag: 'likely_same',
        identicalImageHash: true,
        mode: 'deterministic',
      },
    },
  })
  async visualSimilarityFlag(
    rawInput: unknown,
    ctx: ExecutionContext
  ): Promise<VisualSimilarityResult> {
    const input = parse(VisualSimilarityInputSchema, rawInput, 'visual_similarity_flag');
    const result = await this.visual.compare(input.applicationId, input.compareToApplicationId);

    this.events.stageCompleted(ctx, input.applicationId, 'visual_similarity_flag', result);
    return result;
  }
}
