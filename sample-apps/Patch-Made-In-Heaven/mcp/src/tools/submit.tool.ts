import { ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { ElasticService, type KnowledgeCard } from '../services/elastic.client.js';
import { VerificationRunClient, computePatchDigest } from '../services/verification-run.client.js';
import {
  environmentMetaSchema,
  knowledgeCardSchema,
  isTrustedForIndexing,
  type EnvironmentMeta,
} from '../domain/knowledge-card.js';
import { buildSuccessEnvelope, dependencyUnavailableEnvelope } from '../domain/response-envelope.js';

const submitFixSchema = z.object({
  problemDescription: z.string().trim().min(1).describe('Clear summary of the error or problem solved.'),
  errorLog: z.string().trim().min(1).describe('The error stacktrace or log text that the fix resolves.'),
  patch: z
    .string()
    .trim()
    .min(1)
    .describe('Unified git diff patch - must byte-for-byte match the diff a prior verify_fix call produced.'),
  verificationLog: z
    .string()
    .trim()
    .min(1)
    .describe('The verificationRunId returned by the verify_fix call that proved this exact patch.'),
  environment: environmentMetaSchema,
});

const ERROR_TYPE_PATTERN = /\b([A-Z][A-Za-z0-9]*(?:Error|Exception))\b/;

/** Best-effort extraction since submit_fix's V1 input contract (PRD §6.1) has no separate errorType field. */
function deriveErrorType(errorLog: string): string {
  return errorLog.match(ERROR_TYPE_PATTERN)?.[1] ?? 'UnknownError';
}

/** Order-independent comparison - a caller re-serializing packageVersions in a different key order must still match. */
function normalizeEnvironment(env: EnvironmentMeta): string {
  const packageVersions = env.packageVersions
    ? Object.fromEntries(Object.entries(env.packageVersions).sort(([a], [b]) => a.localeCompare(b)))
    : undefined;
  return JSON.stringify({ language: env.language, version: env.version, framework: env.framework, packageVersions });
}

function environmentsMatch(a: EnvironmentMeta, b: EnvironmentMeta): boolean {
  return normalizeEnvironment(a) === normalizeEnvironment(b);
}

function rejected(code: string, message: string) {
  return buildSuccessEnvelope('REJECTED', {
    knowledgeCardId: null,
    indexed: false,
    rejectionCode: code,
    message,
  });
}

export interface SubmitToolsOptions {
  elasticService?: ElasticService;
  verificationRunClient?: VerificationRunClient;
}

@Controller()
export class SubmitTools {
  private elasticService: ElasticService;
  private verificationRunClient: VerificationRunClient;

  constructor(options: SubmitToolsOptions = {}) {
    this.elasticService = options.elasticService ?? new ElasticService();
    this.verificationRunClient = options.verificationRunClient ?? new VerificationRunClient();
  }

  @Tool({
    name: 'submit_fix',
    description:
      'Publishes an execution-verified patch to the knowledge base. Only stores a fix backed by a real, matching, PASS-status Verification Run created by a prior verify_fix call - never trusts a caller-supplied verification status.',
    inputSchema: submitFixSchema,
  })
  async submitFix(params: z.infer<typeof submitFixSchema>) {
    if (!this.elasticService.isConnected() || !this.verificationRunClient.isConnected()) {
      return dependencyUnavailableEnvelope('Elasticsearch is not configured; submit_fix cannot validate or store a fix.');
    }

    const patchDigest = computePatchDigest(params.patch);
    const run = await this.verificationRunClient.lookup(params.verificationLog, patchDigest);

    if (!run) {
      return rejected(
        'VERIFICATION_RUN_NOT_MATCHED',
        'No matching, unexpired Verification Run was found for this exact patch. Call verify_fix again with the current patch before submitting.'
      );
    }

    if (run.status !== 'PASS') {
      return rejected(
        'VERIFICATION_NOT_PASSED',
        `The matched Verification Run has status "${run.status}", not PASS. A fix can only be submitted after a passing verification.`
      );
    }

    if (!environmentsMatch(run.environment, params.environment)) {
      return rejected(
        'ENVIRONMENT_MISMATCH',
        'The submitted environment does not match the environment the Verification Run actually ran against.'
      );
    }

    const id = `fix_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const card: KnowledgeCard = {
      id,
      problem: params.problemDescription,
      errorType: deriveErrorType(params.errorLog),
      stacktrace: params.errorLog,
      environment: params.environment,
      patch: params.patch,
      verification: {
        status: 'PASS',
        score: 0.9,
        lastVerified: run.createdAt,
        sandbox: 'docker',
        exitCode: run.exitCode ?? undefined,
        durationMs: run.durationMs ?? undefined,
        stdout: run.stdout,
        stderr: run.stderr,
      },
      metrics: { reuseCount: 1 },
      provenance: {
        source: 'agent-submitted',
        addedAt: new Date().toISOString(),
      },
    };

    const parsed = knowledgeCardSchema.safeParse(card);
    if (!parsed.success) {
      return rejected(
        'SCHEMA_VALIDATION_FAILED',
        `Constructed knowledge card failed schema validation: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`
      );
    }

    if (!isTrustedForIndexing(parsed.data)) {
      // Unreachable given the PASS-run gate above, but never index on a technicality.
      return rejected('VERIFICATION_NOT_PASSED', 'The constructed card did not satisfy the trust rule for indexing.');
    }

    try {
      await this.elasticService.indexFix(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return dependencyUnavailableEnvelope(`Failed to index the verified fix: ${message}`);
    }

    return buildSuccessEnvelope('STORED', {
      knowledgeCardId: parsed.data.id,
      indexed: true,
      card: parsed.data,
    });
  }
}
