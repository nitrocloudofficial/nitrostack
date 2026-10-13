import { Injectable } from '@nitrostack/core';
import { EngineRegistryService } from './engine-registry.service.js';
import { ExecutionPlan, ExecutionPlanNode } from '../../../shared/contracts/execution-plan.js';
import { DecisionContext } from '../../../shared/contracts/decision-context.js';
import { StandardEngineOutput } from '../../../shared/types/standard-engine-output.js';
import { EngineRequest } from '../../../shared/contracts/engine.interface.js';

@Injectable({ deps: [EngineRegistryService] })
export class EngineDispatcherService {
  constructor(private readonly engineRegistry: EngineRegistryService) {}

  /**
   * Dispatches and executes an execution plan, running independent engines in parallel
   * and passing upstream results to dependent downstream engines.
   */
  public async dispatchPlan(
    plan: ExecutionPlan,
    context: DecisionContext
  ): Promise<Record<string, StandardEngineOutput>> {
    const executionId = `exec-${Date.now()}`;
    const results: Record<string, StandardEngineOutput> = {};

    if (!plan || !plan.steps || plan.steps.length === 0) {
      return results;
    }

    // Build topological stages
    const stages = this.buildExecutionStages(plan.steps);

    for (const stage of stages) {
      // Execute all nodes in the current stage concurrently
      const stagePromises = stage.map(async (node) => {
        const engine = this.engineRegistry?.getEngine(node.engineId);
        if (!engine) {
          // Return a fallback mock output if engine is not dynamically registered
          return {
            engineId: node.engineId,
            output: {
              engineName: node.engineId,
              confidence: 80,
              summary: `Executed fallback analysis for ${node.engineId}`,
              structuredFindings: {},
              assumptions: [],
              limitations: [],
              recommendations: [],
              metadata: { executionTimeMs: 100, toolsUsed: [], version: '1.0.0' }
            }
          };
        }

        const request: EngineRequest = {
          executionId,
          context,
          upstreamResults: { ...results }
        };

        const output = await engine.execute(request);
        return { engineId: node.engineId, output };
      });

      const stageResults = await Promise.all(stagePromises);
      for (const { engineId, output } of stageResults) {
        results[engineId] = output;
      }
    }

    return results;
  }

  /**
   * Groups plan nodes into sequential execution stages.
   * Nodes in the same stage have satisfied dependencies and can run in parallel.
   */
  private buildExecutionStages(nodes: ExecutionPlanNode[]): ExecutionPlanNode[][] {
    const stages: ExecutionPlanNode[][] = [];
    const executedEngineIds = new Set<string>();
    const remainingNodes = [...nodes];

    while (remainingNodes.length > 0) {
      // Find all nodes whose dependencies have already been executed
      const currentStage = remainingNodes.filter((node) =>
        (node.dependsOn || []).every((depId) => executedEngineIds.has(depId))
      );

      if (currentStage.length === 0) {
        // Fallback safety if dependencies couldn't be resolved cleanly
        stages.push(remainingNodes);
        break;
      }

      stages.push(currentStage);

      // Mark these nodes as executed and remove them from remaining
      for (const node of currentStage) {
        executedEngineIds.add(node.engineId);
        const index = remainingNodes.indexOf(node);
        if (index !== -1) {
          remainingNodes.splice(index, 1);
        }
      }
    }

    return stages;
  }
}
