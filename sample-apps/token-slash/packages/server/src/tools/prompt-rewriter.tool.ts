import {
  ExecutionContext,
  Injectable,
  ToolDecorator as Tool,
  z,
} from '@nitrostack/core';
import type { RewriteResult, TaskType } from '../shared/types.js';
import { TASK_TYPES } from '../shared/types.js';
import { PromptRewriterService } from '../orchestration/prompt-rewriter.service.js';

@Injectable()
export class PromptRewriterTools {
  constructor(private readonly promptRewriter: PromptRewriterService) {}

  /**
   * Rewrites a user prompt to be leaner while preserving intent, constraints,
   * formats, and embedded examples. Uses task-type signals to decide what filler
   * is safe to trim (e.g., keeps creative-writing tone, trims bureaucratic prose
   * in summarization and Q&A prompts).
   */
  @Tool({
    name: 'rewrite_prompt',
    description:
      'Rewrite an AI prompt to reduce token count without losing intent. ' +
      'Preserves code blocks, stated constraints, output formats, and examples. ' +
      'Returns the optimized prompt and estimated token savings percentage.',
    inputSchema: z.object({
      prompt: z
        .string()
        .describe('The raw user prompt to optimize for token efficiency'),
      taskType: z
        .enum(TASK_TYPES as [TaskType, ...TaskType[]])
        .describe(
          'Task type from the Complexity Classifier — controls rewrite strategy',
        ),
    }),
  })
  rewritePrompt(
    input: { prompt: string; taskType: TaskType },
    _ctx: ExecutionContext,
  ): RewriteResult {
    return this.promptRewriter.rewritePrompt(input.prompt, input.taskType);
  }
}
