import { ToolDecorator as Tool, ControllerDecorator as Controller } from '@nitrostack/core';
import { z } from 'zod';
import { ElasticService } from '../services/elastic.client.js';
import { buildSuccessEnvelope, dependencyUnavailableEnvelope } from '../domain/response-envelope.js';

// NOT_FOUND is a normal, ok:true product outcome (PRD §6.1's closing note: MISS,
// DEGRADED, FAIL, TIMEOUT, REJECTED, and NOT_FOUND are "expected product outcomes,"
// distinct from the ok:false DEPENDENCY_UNAVAILABLE/INVALID_INPUT failure statuses).
function notFoundEnvelope(knowledgeCardId: string) {
  return buildSuccessEnvelope('NOT_FOUND', {
    message: `Knowledge card '${knowledgeCardId}' not found.`,
  });
}

const getPatchSchema = z.object({
  knowledgeCardId: z.string().describe('Unique identifier of the verified knowledge card.'),
});

const getExecutionLogSchema = z.object({
  knowledgeCardId: z.string().describe('Unique identifier of the verified knowledge card.'),
});

export interface RetrieveToolsOptions {
  elasticService?: ElasticService;
}

@Controller()
export class RetrieveTools {
  private elasticService: ElasticService;

  constructor(options: RetrieveToolsOptions = {}) {
    this.elasticService = options.elasticService ?? new ElasticService();
  }

  @Tool({
    name: 'get_patch',
    description: 'Returns the raw unified git diff patch for a verified solution.',
    inputSchema: getPatchSchema,
  })
  async getPatch(params: z.infer<typeof getPatchSchema>) {
    if (!this.elasticService.isConnected()) {
      return dependencyUnavailableEnvelope('Elasticsearch is not configured; get_patch cannot run.');
    }
    const card = await this.elasticService.getFixById(params.knowledgeCardId);
    if (!card) {
      return notFoundEnvelope(params.knowledgeCardId);
    }
    return buildSuccessEnvelope('OK', {
      id: card.id,
      unifiedDiff: card.patch,
    });
  }

  @Tool({
    name: 'get_execution_log',
    description: 'Retrieves full stdout/stderr verification execution logs for a specific knowledge entry.',
    inputSchema: getExecutionLogSchema,
  })
  async getExecutionLog(params: z.infer<typeof getExecutionLogSchema>) {
    if (!this.elasticService.isConnected()) {
      return dependencyUnavailableEnvelope('Elasticsearch is not configured; get_execution_log cannot run.');
    }
    const card = await this.elasticService.getFixById(params.knowledgeCardId);
    if (!card) {
      return notFoundEnvelope(params.knowledgeCardId);
    }
    return buildSuccessEnvelope('OK', {
      id: card.id,
      verification: card.verification,
      stdout: card.verification.stdout ?? '',
      stderr: card.verification.stderr ?? '',
      exitCode: card.verification.exitCode ?? null,
      durationMs: card.verification.durationMs ?? null,
    });
  }
}
