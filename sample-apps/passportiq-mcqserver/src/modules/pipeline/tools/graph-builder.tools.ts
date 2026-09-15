/**
 * build_risk_graph — Backend B, pipeline stage 6. The demo's reveal moment.
 *
 * Builds the applicant link-analysis graph for the cluster containing this
 * application: nodes are applications, edges are shared identifiers. Feeds
 * Frontend B's GraphView and Backend A's graph-weighted score_risk.
 *
 * Deterministic graph construction over seeded data — no LLM call.
 */
import { Injectable, ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import {
  BuildRiskGraphToolOutputSchema,
  type BuildRiskGraphToolOutput,
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
export class GraphBuilderTools {
  constructor(
    private readonly graphService: GraphService,
    private readonly events: PipelineEventsService
  ) {}

  @Tool({
    name: 'build_risk_graph',
    title: 'Build risk graph',
    description:
      "Build the applicant link-analysis graph for this application's cluster. Nodes are " +
      'applications (coloured by risk level), edges are the identifiers they share. Traverses ' +
      'links transitively, so an applicant connected only through an intermediary still appears.',
    inputSchema: z.object({
      applicationId: z.string().min(1).describe('Passport application ID at the centre of the graph'),
      includeIdentifierNodes: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Also emit the shared identifiers themselves as contact/passport/document nodes. ' +
            'Default false keeps the applicant-only view GraphView renders during the demo.'
        ),
    }),
    outputSchema: BuildRiskGraphToolOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Building the cross-application risk graph...',
      invoked: 'Risk graph ready',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001' },
      response: {
        applicationId: 'PIQ-2026-2001',
        nodes: [
          {
            nodeId: 'PIQ-2026-2001',
            id: 'PIQ-2026-2001',
            kind: 'application',
            label: 'Vikram Nair (PIQ-2026-2001)',
            riskLevel: 'high',
            nodeRole: 'applicant',
            isSubject: true,
            metadata: { applicantName: 'Vikram Nair' },
          },
        ],
        edges: [
          {
            from: 'PIQ-2026-2001',
            to: 'PIQ-2026-2004',
            source: 'PIQ-2026-2001',
            target: 'PIQ-2026-2004',
            relationship: 'shares_identifier',
            weight: 1,
            reason: 'reused document photo',
            metadata: { identifierKind: 'document_image', severity: 'high' },
          },
        ],
        clusterSize: 4,
        clusterSummary: {
          subjectApplicationId: 'PIQ-2026-2001',
          linkedApplicationIds: ['PIQ-2026-2002', 'PIQ-2026-2003', 'PIQ-2026-2004'],
          sharedSignalKinds: ['reused address', 'reused document photo', 'reused phone number'],
          density: 1,
          isCoordinatedPattern: true,
          subjectRiskLevel: 'high',
          headline:
            'Vikram Nair is linked to 3 other applicants by reused address, reused document photo and reused phone number. The overlap pattern is consistent with a coordinated group, not coincidence.',
        },
      },
    },
  })
  @Widget('graph-view')
  async buildGraph(
    input: { applicationId: string; includeIdentifierNodes?: boolean },
    ctx: ExecutionContext
  ): Promise<BuildRiskGraphToolOutput> {
    const graph = this.graphService.buildGraph(
      input.applicationId,
      input.includeIdentifierNodes ?? false
    );

    this.events.stageCompleted(ctx, input.applicationId, 'build_risk_graph', graph);

    return graph;
  }
}
