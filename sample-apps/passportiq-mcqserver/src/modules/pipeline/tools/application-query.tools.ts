/**
 * Applicant-pool read tools — Backend B.
 *
 * Backend B owns the seeded dataset, so it owns the tools that read it. These
 * exist so nothing else in the team has to import the JSON directly:
 *
 *   - Frontend A's dashboard needs a case list to render and an ID to pass into
 *     the pipeline. Hardcoding "PIQ-2026-2001" into the UI is exactly the kind of
 *     shortcut that breaks the moment the demo picks a different applicant.
 *   - Backend A's tools need document/field lookups for one application.
 *   - The MCP client (Claude) needs to be able to answer "which applications are
 *     waiting?" without being handed an ID first.
 *
 * All read-only, all deterministic, none of them emit pipeline stage events —
 * they are not pipeline stages, and emitting from here would corrupt the
 * progress state PipelineCompleteGuard depends on.
 */
import { Injectable, ToolDecorator as Tool, z } from '@nitrostack/core';
import { ApplicationStatusSchema } from '../../../contracts/index.js';
import { ApplicationService } from '../services/application.service.js';
import { GraphService } from '../services/graph.service.js';
import { PipelineStateService } from '../services/pipeline-state.service.js';

/** Shape of one row in the case list. Kept flat — it renders in a table. */
const ApplicationSummarySchema = z.object({
  applicationId: z.string(),
  applicantName: z.string(),
  applicationType: z.string(),
  dateOfBirth: z.string(),
  passportNumber: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string(),
  documentCount: z.number().int(),
  submittedAt: z.string(),
  status: z.string(),
});

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
@Injectable({ deps: [ApplicationService, GraphService, PipelineStateService] })
export class ApplicationQueryTools {
  constructor(
    private readonly applications: ApplicationService,
    private readonly graph: GraphService,
    private readonly state: PipelineStateService
  ) {}

  @Tool({
    name: 'list_applications',
    title: 'List passport applications',
    description:
      'List every passport application in the queue with its applicant, document count, ' +
      'submission date, current status and verification progress. Use this to pick an ' +
      'application to verify — do not guess application IDs.',
    inputSchema: z.object({
      // Reuses the contract enum rather than restating the values — a hand-typed
      // duplicate here would silently filter to zero rows the moment the shared
      // status list changes.
      status: ApplicationStatusSchema.optional().describe(
        'Only return applications with this status. Omit for all.'
      ),
    }),
    outputSchema: z.object({
      total: z.number().int(),
      applications: z.array(
        ApplicationSummarySchema.extend({
          verificationProgress: z.number().min(0).max(100),
          decisionReady: z.boolean(),
        })
      ),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Loading the application queue...',
      invoked: 'Application queue loaded',
    },
    examples: {
      request: {},
      response: {
        total: 9,
        applications: [
          {
            applicationId: 'PIQ-2026-2001',
            applicantName: 'Vikram Nair',
            status: 'pending_review',
            verificationProgress: 0,
            decisionReady: false,
          },
        ],
      },
    },
  })
  async listApplications(input: { status?: string }) {
    const rows = this.applications
      .getAll()
      .map((application) => {
        const summary = this.applications.getSummary(application.applicationId);
        return {
          ...summary,
          verificationProgress: this.state.getProgress(application.applicationId).percentComplete,
          decisionReady: this.state.isPipelineComplete(application.applicationId),
        };
      })
      .filter((row) => (input.status ? row.status === input.status : true));

    return { total: rows.length, applications: rows };
  }

  @Tool({
    name: 'get_application',
    title: 'Get application detail',
    description:
      'Full detail for one passport application: applicant fields, address, every submitted ' +
      'document with its type and image hash, current status, and any decision already ' +
      'recorded. This is the raw case file — verification findings come from the pipeline tools.',
    inputSchema: z.object({
      applicationId: z.string().min(1).describe('Passport application ID'),
    }),
    outputSchema: z.object({
      summary: ApplicationSummarySchema,
      applicant: z.record(z.unknown()),
      documents: z.array(z.record(z.unknown())),
      linkedApplicationIds: z.array(z.string()),
      progress: z.record(z.unknown()),
      decision: z.record(z.unknown()).nullable(),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Opening the case file...',
      invoked: 'Case file loaded',
    },
    examples: {
      request: { applicationId: 'PIQ-2026-2001' },
      response: {
        summary: { applicationId: 'PIQ-2026-2001', applicantName: 'Vikram Nair' },
        linkedApplicationIds: ['PIQ-2026-2002', 'PIQ-2026-2003', 'PIQ-2026-2004'],
      },
    },
  })
  async getApplication(input: { applicationId: string }) {
    const application = this.applications.getApplication(input.applicationId);

    return {
      summary: this.applications.getSummary(application.applicationId),
      applicant: this.applications.getSeedApplicant(application.applicationId) as unknown as Record<
        string,
        unknown
      >,
      documents: application.documents as unknown as Record<string, unknown>[],
      // Cheap here, and it lets the case file show "linked to 3 others" before the
      // officer has run anything — the hook that makes them run the pipeline.
      linkedApplicationIds: this.graph.getLinkedApplicationIds(application.applicationId),
      progress: this.state.getProgress(application.applicationId) as unknown as Record<
        string,
        unknown
      >,
      decision:
        (this.applications.getDecision(application.applicationId) as unknown as Record<
          string,
          unknown
        >) ?? null,
    };
  }

  @Tool({
    name: 'list_applicant_clusters',
    title: 'List applicant clusters',
    description:
      'Group the entire applicant pool into clusters of applications connected by shared ' +
      'identifiers (phone, address, email, passport number, identity, document image). ' +
      'Answers "are there any fraud rings in the queue at all?" without verifying each ' +
      'application one by one — the intake-triage view.',
    inputSchema: z.object({
      minClusterSize: z
        .number()
        .int()
        .min(2)
        .optional()
        .default(2)
        .describe('Only return clusters with at least this many applications.'),
    }),
    outputSchema: z.object({
      clusterCount: z.number().int(),
      isolatedApplicationCount: z.number().int(),
      clusters: z.array(
        z.object({
          applicationIds: z.array(z.string()),
          applicantNames: z.array(z.string()),
          size: z.number().int(),
          sharedSignalKinds: z.array(z.string()),
        })
      ),
    }),
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    invocation: {
      invoking: 'Scanning the queue for connected applicants...',
      invoked: 'Cluster scan complete',
    },
    examples: {
      request: {},
      response: {
        clusterCount: 2,
        isolatedApplicationCount: 3,
        clusters: [
          {
            applicationIds: [
              'PIQ-2026-2001',
              'PIQ-2026-2002',
              'PIQ-2026-2003',
              'PIQ-2026-2004',
            ],
            size: 4,
            sharedSignalKinds: ['address', 'document_image', 'email', 'passport_number', 'phone'],
          },
        ],
      },
    },
  })
  // NOT cached, deliberately. @Cache({ ttl }) was tried here and removed: it
  // prints "[Cache DEBUG] ..." lines to stdout on every call, which is
  // unacceptable noise on a stdio MCP transport and on a demo screen. The work it
  // would save is a BFS over 9 applications — microseconds. SignalIndex already
  // precomputes the link index once at construction, so this is cheap.
  async listClusters(input: { minClusterSize?: number }) {
    const minimum = input.minClusterSize ?? 2;
    const all = this.graph.getAllClusters();

    const clusters = all
      .filter((ids) => ids.length >= minimum)
      .map((applicationIds) => {
        const graph = this.graph.buildGraph(applicationIds[0]!);
        return {
          applicationIds,
          applicantNames: applicationIds.map(
            (id) => this.applications.getApplication(id).fullName
          ),
          size: applicationIds.length,
          sharedSignalKinds: graph.clusterSummary.sharedSignalKinds,
        };
      })
      // Biggest ring first — that is the one worth opening.
      .sort((a, b) => b.size - a.size || a.applicationIds[0]!.localeCompare(b.applicationIds[0]!));

    return {
      clusterCount: clusters.length,
      isolatedApplicationCount: all.filter((ids) => ids.length === 1).length,
      clusters,
    };
  }
}
