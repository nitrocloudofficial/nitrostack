/**
 * AIRouter
 *
 * Maps an AITaskName to the single agent responsible for it:
 *
 *   medicine-analysis  -> MedicineAI
 *   report-summary     -> ReportAI
 *   emergency-analysis -> EmergencyAI
 *   drug-origin        -> MedicineAI (medication-origin is part of Medicine AI's scope)
 *
 * Adding a new AI agent means calling `router.register(new SomeNewAI())`
 * in the composition root — nothing in AIRouter, AIGateway, or
 * SecureDataGateway needs to change.
 */

import type { IAIAgent, IAIRouter } from '../interfaces/gateway.interfaces.js';
import type { AIRequest, AIResponse, AITaskName } from '../types/gateway.types.js';
import { NotFoundError } from '../utils/errors.js';

export class AIRouter implements IAIRouter {
  private readonly agentsByTask = new Map<AITaskName, IAIAgent<any, any>>();

  register(agent: IAIAgent<any, any>): void {
    for (const task of agent.handles) {
      if (this.agentsByTask.has(task)) {
        throw new Error(
          `AIRouter: task "${task}" is already handled by "${this.agentsByTask.get(task)!.name}" — cannot register "${agent.name}" for the same task.`
        );
      }
      this.agentsByTask.set(task, agent);
    }
  }

  async route(request: AIRequest): Promise<AIResponse> {
    const agent = this.agentsByTask.get(request.task);
    if (!agent) {
      throw new NotFoundError(`No AI agent registered for task "${request.task}".`);
    }

    const startedAt = Date.now();
    const output = await agent.run(request.input);

    return {
      task: request.task,
      output: output as Record<string, unknown>,
      agent: agent.name,
      tookMs: Date.now() - startedAt
    };
  }
}
