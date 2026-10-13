import {
  ToolDecorator as Tool,
  Widget,
  z,
  type ExecutionContext,
  Injectable,
} from '@nitrostack/core';
import {
  assignDemoIdentity,
  authenticateAgent,
  credentialFromMetadata,
  demoModeEnabled,
} from '../../guards/agent-api-key.guard.js';
import { ComputeService } from './compute.service.js';
import { supportedRuntimeIds, type ComputeRequest } from './compute.types.js';

const networkRequirementSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none') }),
  z.object({
    mode: z.literal('allowlist'),
    allowedHosts: z
      .array(
        z
          .string()
          .min(1)
          .max(253)
          .regex(
            /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?<!-)$/,
            'Use hostnames only, without schemes, paths, ports, or wildcards.',
          ),
      )
      .max(32),
  }),
  z.object({ mode: z.literal('unrestricted') }),
]);

/**
 * A guard sees only `context.metadata`, and no MCP client exposes a way for a
 * model to write the `_meta` object that metadata is built from. So the
 * credential is a declared input instead: every client can fill a schema field,
 * and the same key still yields the same per-agent identity and audit trail.
 */
const agentApiKeySchema = z
  .string()
  .min(1)
  .optional()
  .describe(
    'BouldersGate agent API key. Required unless the client sends it in the tool call’s `_meta.apiKey`, or the deployment runs in demo mode.',
  );

const computeRequestSchema = z.object({
  apiKey: agentApiKeySchema,
  runtime: z.enum(supportedRuntimeIds).describe('Requested runtime and major version.'),
  memoryMb: z.number().int().min(128).max(32768),
  cpuCores: z.number().min(0.25).max(16),
  durationMinutes: z.number().int().min(1).max(1440),
  network: networkRequirementSchema,
  privileged: z.boolean().default(false),
  hostFilesystem: z.boolean().default(false),
  dockerSocket: z.boolean().default(false),
});

/**
 * NitroStack validates against the schema but does not apply zod `.default()`
 * values before invoking a handler, so an omitted optional field arrives as
 * `undefined`. Every default this server relies on is therefore applied here.
 * Left to zod, an omitted `timeoutSeconds` became `undefined * 1000 = NaN` and
 * every command reported a timeout after ~4ms.
 */
const DEFAULT_TIMEOUT_SECONDS = 30;
const DEFAULT_AUDIT_LIMIT = 50;

function agentId(context: ExecutionContext): string {
  const subject = context.auth?.subject;
  if (!subject) {
    throw new Error('Authenticated agent identity is required.');
  }
  return subject;
}

/**
 * Authenticate before any tool body runs. Accepts the declared `apiKey` input
 * first, then falls back to `_meta` so existing metadata clients keep working.
 *
 * A valid key always wins and keeps its own identity. Only when no valid key is
 * presented does demo mode decide the outcome: admit the call under the shared
 * demo identity, or reject it.
 */
async function authenticate(
  apiKey: string | undefined,
  context: ExecutionContext,
): Promise<void> {
  const credential = apiKey ?? credentialFromMetadata(context);
  if (await authenticateAgent(credential, context)) {
    return;
  }
  if (demoModeEnabled()) {
    assignDemoIdentity(context);
    return;
  }
  throw new Error(
    'Authentication failed. Pass a valid BouldersGate agent key as the `apiKey` input.',
  );
}

@Injectable({ deps: [ComputeService] })
export class ComputeTools {
  constructor(private readonly compute: ComputeService) {}

  @Tool({
    name: 'request_compute',
    title: 'Request compute capability',
    description:
      'Describe the compute a task genuinely needs. Evaluates the request against opaque, human-authored policy and returns either an exact offer, a structured counter-offer with every reduction, or a denial. This tool never creates an environment.',
    inputSchema: computeRequestSchema,
    annotations: {
      destructiveHint: false,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: false,
    },
    examples: {
      request: {
        runtime: 'node20',
        memoryMb: 16384,
        cpuCores: 4,
        durationMinutes: 1440,
        network: { mode: 'unrestricted' },
        privileged: false,
        hostFilesystem: false,
        dockerSocket: false,
      },
    },
  })
  @Widget('compute-offer')
  async requestCompute(
    input: ComputeRequest & { apiKey?: string },
    context: ExecutionContext,
  ) {
    const { apiKey, ...rest } = input;
    await authenticate(apiKey, context);
    const request: ComputeRequest = {
      ...rest,
      privileged: rest.privileged ?? false,
      hostFilesystem: rest.hostFilesystem ?? false,
      dockerSocket: rest.dockerSocket ?? false,
    };
    context.logger.info('Evaluating compute capability request.');
    return this.compute.requestCompute(agentId(context), request);
  }

  @Tool({
    name: 'accept_offer',
    title: 'Accept compute offer',
    description:
      'Accept one unexpired offer returned by request_compute. Only this explicit second step may materialize a live environment, and an offer can be accepted at most once.',
    inputSchema: z.object({
      apiKey: agentApiKeySchema,
      offerId: z.string().startsWith('offer_'),
    }),
    annotations: {
      destructiveHint: false,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: true,
    },
  })
  async acceptOffer(
    input: { apiKey?: string; offerId: string },
    context: ExecutionContext,
  ) {
    await authenticate(input.apiKey, context);
    context.logger.info('Accepting compute offer.', { offerId: input.offerId });
    return this.compute.acceptOffer(agentId(context), input.offerId);
  }

  @Tool({
    name: 'execute_command',
    title: 'Execute command in environment',
    description:
      'Execute an argument vector inside an active environment owned by the authenticated agent. No shell is inserted; pass the executable as argv[0]. Output and runtime are bounded.',
    inputSchema: z.object({
      apiKey: agentApiKeySchema,
      environmentId: z.string().startsWith('env_'),
      argv: z.array(z.string().max(4096)).min(1).max(64),
      timeoutSeconds: z.number().int().min(1).max(60).default(30),
    }),
    annotations: {
      destructiveHint: true,
      idempotentHint: false,
      readOnlyHint: false,
      openWorldHint: false,
    },
  })
  async executeCommand(
    input: {
      apiKey?: string;
      environmentId: string;
      argv: string[];
      timeoutSeconds?: number;
    },
    context: ExecutionContext,
  ) {
    await authenticate(input.apiKey, context);
    context.logger.info('Executing command in managed environment.', {
      environmentId: input.environmentId,
    });
    return this.compute.execute(
      agentId(context),
      input.environmentId,
      input.argv,
      input.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
    );
  }

  @Tool({
    name: 'release_environment',
    title: 'Release compute environment',
    description:
      'Stop and destroy an environment owned by the authenticated agent before its TTL. Repeating release on an already released environment has no additional effect.',
    inputSchema: z.object({
      apiKey: agentApiKeySchema,
      environmentId: z.string().startsWith('env_'),
    }),
    annotations: {
      destructiveHint: true,
      idempotentHint: true,
      readOnlyHint: false,
      openWorldHint: false,
    },
  })
  async releaseEnvironment(
    input: { apiKey?: string; environmentId: string },
    context: ExecutionContext,
  ) {
    await authenticate(input.apiKey, context);
    context.logger.info('Releasing managed environment.', {
      environmentId: input.environmentId,
    });
    return this.compute.release(agentId(context), input.environmentId);
  }

  @Tool({
    name: 'list_environments',
    title: 'List owned environments',
    description:
      'List only the environments owned by the authenticated agent. Provider identifiers and infrastructure details are never returned.',
    inputSchema: z.object({
      apiKey: agentApiKeySchema,
    }),
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: false,
    },
  })
  async listEnvironments(input: { apiKey?: string }, context: ExecutionContext) {
    await authenticate(input.apiKey, context);
    return {
      environments: this.compute.listEnvironments(agentId(context)),
    };
  }

  @Tool({
    name: 'list_audit_events',
    title: 'List agent audit events',
    description:
      'Return recent BouldersGate decisions and lifecycle events for the authenticated agent without command contents, credentials, or provider identifiers.',
    inputSchema: z.object({
      apiKey: agentApiKeySchema,
      limit: z.number().int().min(1).max(100).default(50),
    }),
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
      readOnlyHint: true,
      openWorldHint: false,
    },
  })
  async listAuditEvents(
    input: { apiKey?: string; limit?: number },
    context: ExecutionContext,
  ) {
    await authenticate(input.apiKey, context);
    return {
      events: this.compute.listAuditEvents(
        agentId(context),
        input.limit ?? DEFAULT_AUDIT_LIMIT,
      ),
    };
  }
}
