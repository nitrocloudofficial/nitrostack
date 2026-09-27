/**
 * detect_duplicate_signals — Backend B, pipeline stage 5.
 *
 * The first stage that looks beyond a single application: it checks this
 * application's phone, address, email, passport number, identity and document
 * image hashes against every other seeded applicant.
 *
 * Deterministic — no LLM call.
 *
 * NOTE ON IMPORTS: `Tool` is exported from @nitrostack/core as the runtime Tool
 * CLASS; the decorator is exported as `ToolDecorator`. Importing `{ Tool }` and
 * writing `@Tool({...})` throws "Class constructor cannot be invoked without
 * 'new'" at load time. `ToolDecorator as Tool` is the pattern every working
 * NitroStack sample app uses.
 */
import { Injectable, ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import {
  DetectDuplicateSignalsToolOutputSchema,
  type DetectDuplicateSignalsToolOutput,
} from '../../../contracts/index.js';
import { GraphService } from '../services/graph.service.js';
import { PipelineEventsService } from '../services/pipeline-events.service.js';

/**
 * @Injectable({ deps: [...] }) — the deps array is MANDATORY, not documentation.
 *
 * DIContainer.getDependencies() prefers explicit `nitrostack:deps` metadata and
 * only falls back to TypeScript's `design:paramtypes`, which is empty under ESM
 * unless reflect-metadata was loaded before the decorator ran. Without the
 * explicit list, this class is constructed with NO arguments and every injected
 * field is `undefined` — the first tool call then dies with
 * "Cannot read properties of undefined". Order must match the constructor.
 */
@Injectable({ deps: [GraphService, PipelineEventsService] })
export class DuplicateDetectorTools {
  constructor(
    private readonly graphService: GraphService,
    private readonly events: PipelineEventsService
  ) {}

  @Tool({
    name: 'detect_duplicate_signals',
    title: 'Detect duplicate signals',
    description:
      "Check this application's phone, address, email, passport number, identity and document " +
      'image hashes against every other seeded applicant for reuse. Returns one signal per ' +
      'reused identifier per matched application, with severity and confidence.',
    inputSchema: z.object({
      applicationId: z.string().min(1).describe('Passport application ID to check'),
    }),
    outputSchema: DetectDuplicateSignalsToolOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Checking for reused identifiers across the applicant pool...',
      invoked: 'Duplicate-signal check complete',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001' },
      response: {
        applicationId: 'PIQ-2026-2001',
        signals: [
          {
            signalId: 'sig-document_image-PIQ-2026-2001-PIQ-2026-2004-1a2b3c',
            type: 'document_similarity',
            severity: 'high',
            confidence: 0.99,
            matchedApplicationId: 'PIQ-2026-2004',
            evidence: {
              signalSubtype: 'document_image',
              reason: 'reused document photo',
              matchedApplicantName: 'Manoj Pillai',
            },
          },
        ],
        reusedPhone: ['PIQ-2026-2002', 'PIQ-2026-2003'],
        reusedAddress: ['PIQ-2026-2003', 'PIQ-2026-2004'],
        reusedDocumentImage: ['PIQ-2026-2004'],
        linkedApplicantIds: ['PIQ-2026-2002', 'PIQ-2026-2003', 'PIQ-2026-2004'],
        summary: {
          signalCount: 5,
          highestSeverity: 'high',
          linkedApplicationCount: 3,
          headline:
            'Vikram Nair shares reused phone number, reused address and reused document photo with 3 other applications.',
        },
      },
    },
  })
  async detectDuplicates(
    input: { applicationId: string },
    ctx: ExecutionContext
  ): Promise<DetectDuplicateSignalsToolOutput> {
    const result = this.graphService.findReusedSignals(input.applicationId);

    this.events.stageCompleted(ctx, input.applicationId, 'detect_duplicate_signals', result);

    return result;
  }
}
