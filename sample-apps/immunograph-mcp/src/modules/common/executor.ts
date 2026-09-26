import { performance } from 'node:perf_hooks';

import { canonicalJsonSha256 } from '../../lib/algorithms/index.js';
import type { CanonicalJsonValue } from '../../lib/algorithms/index.js';
import type { ExecutionContext, JsonValue } from '@nitrostack/core';
import { z } from 'zod';

import { CapabilityUnavailableError } from './capability-port.js';
import { TOOL_VERSION, toolFailureSchema, toolSuccessSchema } from './contracts.js';

export class ToolExecutionError extends Error {
  constructor(
    readonly code: string,
    readonly category:
      'VALIDATION' | 'SCIENTIFIC' | 'CONNECTOR' | 'TIMEOUT' | 'RATE_LIMIT' | 'INTERNAL',
    message: string,
    readonly retryable = false,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

function runIdFrom(input: unknown, context: ExecutionContext): string {
  if (
    typeof input === 'object' &&
    input !== null &&
    'runId' in input &&
    typeof input.runId === 'string'
  ) {
    return input.runId;
  }
  const metadataRunId = context.metadata?.runId;
  return typeof metadataRunId === 'string' ? metadataRunId : 'unassigned';
}

export async function executeTool<TInput, TData>(options: {
  toolName: string;
  input: unknown;
  inputSchema: z.ZodType<TInput>;
  dataSchema: z.ZodType<TData>;
  context: ExecutionContext;
  operation(input: TInput): Promise<TData> | TData;
}) {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const runId = runIdFrom(options.input, options.context);
  let inputHash = '0'.repeat(64);
  try {
    inputHash = canonicalJsonSha256(options.input as CanonicalJsonValue);
  } catch {
    // Zod reports the actionable validation failure below.
  }
  const baseMeta = {
    requestId: options.context.requestId,
    runId,
    toolName: options.toolName,
    toolVersion: TOOL_VERSION,
    startedAt,
    inputHash,
  };
  options.context.logger.info('mcp.tool.start', {
    requestId: baseMeta.requestId,
    runId,
    toolName: options.toolName,
    toolVersion: TOOL_VERSION,
    inputHash,
  });
  try {
    options.context.task?.throwIfCancelled();
    options.context.task?.updateProgress(`Validating ${options.toolName} input`);
    const input = options.inputSchema.parse(options.input);
    options.context.task?.throwIfCancelled();
    options.context.task?.updateProgress(`Executing ${options.toolName}`);
    const data = options.dataSchema.parse(await options.operation(input));
    options.context.task?.throwIfCancelled();
    const completedAt = new Date().toISOString();
    const durationMs = performance.now() - started;
    const result = toolSuccessSchema(options.dataSchema).parse({
      ok: true,
      data,
      meta: {
        ...baseMeta,
        completedAt,
        durationMs,
        outputHash: canonicalJsonSha256(data as CanonicalJsonValue),
      },
    });
    options.context.logger.info('mcp.tool.finish', {
      requestId: baseMeta.requestId,
      runId,
      toolName: options.toolName,
      durationMs,
      success: true,
    });
    options.context.task?.updateProgress(`Completed ${options.toolName}`);
    return result;
  } catch (error) {
    const mapped =
      error instanceof z.ZodError
        ? new ToolExecutionError(
            'VALIDATION_FAILED',
            'VALIDATION',
            'Tool input validation failed',
            false,
            {
              issues: error.issues.map((issue) => ({
                path: issue.path.join('.'),
                code: issue.code,
              })),
            },
          )
        : error instanceof CapabilityUnavailableError
          ? new ToolExecutionError(
              'DEPENDENCY_UNAVAILABLE',
              'INTERNAL',
              `The ${error.capability} capability is not configured.`,
            )
          : error instanceof ToolExecutionError
            ? error
            : new ToolExecutionError('INTERNAL_ERROR', 'INTERNAL', 'Unexpected tool failure');
    const completedAt = new Date().toISOString();
    const durationMs = performance.now() - started;
    const result = toolFailureSchema.parse({
      ok: false,
      error: {
        code: mapped.code,
        category: mapped.category,
        message: mapped.message,
        retryable: mapped.retryable,
        ...(mapped.details === undefined ? {} : { details: mapped.details }),
      },
      meta: { ...baseMeta, completedAt, durationMs },
    });
    const logMeta: Record<string, JsonValue> = {
      requestId: baseMeta.requestId,
      runId,
      toolName: options.toolName,
      durationMs,
      success: false,
      errorCode: mapped.code,
    };
    options.context.logger.error('mcp.tool.failure', logMeta);
    return result;
  }
}
