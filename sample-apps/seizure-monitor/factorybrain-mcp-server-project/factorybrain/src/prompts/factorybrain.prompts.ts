import { ExecutionContext, Injectable, PromptDecorator as Prompt } from '@nitrostack/core';
import { AiService } from '../services/ai.service.js';
import type { PromptName } from '../services/prompt-templates.js';

@Injectable({ deps: [AiService] })
export class FactoryBrainPrompts {
  constructor(private readonly ai: AiService) {}
  @Prompt({ name: 'failure_analysis', description: 'Versioned reasoning prompt for sustained machine anomaly analysis.', arguments: [{ name: 'context', description: 'Machine registry and sensor-window context.', required: true }] })
  failure(args: { context?: string }, ctx: ExecutionContext) { return this.messages('failure_analysis', args.context, ctx); }
  @Prompt({ name: 'maintenance_planning', description: 'Versioned reasoning prompt for maintenance planning.', arguments: [{ name: 'context', description: 'Failure, registry, and maintenance-history context.', required: true }] })
  maintenance(args: { context?: string }, ctx: ExecutionContext) { return this.messages('maintenance_planning', args.context, ctx); }
  @Prompt({ name: 'purchase_recommendation', description: 'Versioned reasoning prompt for supplier ranking.', arguments: [{ name: 'context', description: 'Part request, urgency, and supplier context.', required: true }] })
  purchase(args: { context?: string }, ctx: ExecutionContext) { return this.messages('purchase_recommendation', args.context, ctx); }
  @Prompt({ name: 'production_optimization', description: 'Versioned reasoning prompt for disruption planning.', arguments: [{ name: 'context', description: 'Disruption, orders, machines, and schedules.', required: true }] })
  production(args: { context?: string }, ctx: ExecutionContext) { return this.messages('production_optimization', args.context, ctx); }
  @Prompt({ name: 'manager_summary', description: 'Versioned reasoning prompt for executive reporting.', arguments: [{ name: 'context', description: 'Combined agent outputs and factory policy.', required: true }] })
  manager(args: { context?: string }, ctx: ExecutionContext) { return this.messages('manager_summary', args.context, ctx); }
  private messages(name: PromptName, context: string | undefined, ctx: ExecutionContext) {
    ctx.logger.info(`Rendering FactoryBrain prompt ${name}@${this.ai.getPromptVersion()}`);
    return [{ role: 'system' as const, content: `${this.ai.getPrompt(name)}\nPrompt version: ${this.ai.getPromptVersion()}` }, { role: 'user' as const, content: context ?? '' }];
  }
}
