import { Injectable, ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import { ConsensusEngine } from './consensus.js';
import { DecisionService } from './decision.service.js';
import { ConflictResolver } from './conflict-resolver.js';

@Injectable()
export class DecisionTools {
  private consensusEngine = new ConsensusEngine();
  private decisionService = new DecisionService();
  private conflictResolver = new ConflictResolver();

  @Tool({
    name: 'evaluate_consensus',
    description:
      'Evaluate consensus across multiple agent results. ' +
      'Scores and ranks agent outputs to select the best responses.',
    inputSchema: z.object({
      results: z.array(
        z.object({
          agent: z.string(),
          role: z.string(),
          success: z.boolean(),
          output: z.string(),
          executionTime: z.number(),
        })
      ).describe('Array of agent execution results to evaluate'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  async evaluateConsensus(
    input: { results: Array<{ agent: string; role: string; success: boolean; output: string; executionTime: number }> },
    ctx: any
  ) {
    const consensus = this.consensusEngine.evaluate(input.results);
    return {
      score: consensus.score,
      confidence: consensus.confidence,
      selectedCount: consensus.selected.length,
      discardedCount: consensus.discarded.length,
    };
  }

  @Tool({
    name: 'make_decision',
    description:
      'Run the AEIOS-X Decision Engine on consensus results and detected intents. ' +
      'Produces priority, risk level, confidence, and recommended action.',
    inputSchema: z.object({
      consensusScore: z.number().describe('Consensus score (0-2)'),
      consensusConfidence: z.number().describe('Consensus confidence (0-1)'),
      intents: z.array(z.string()).describe('Detected intent types'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  async makeDecision(
    input: { consensusScore: number; consensusConfidence: number; intents: string[] },
    ctx: any
  ) {
    const consensus = {
      score: input.consensusScore,
      confidence: input.consensusConfidence,
      selected: [],
      discarded: [],
      summary: '',
    };

    const decision = this.decisionService.decide(
      consensus,
      input.intents as any[]
    );

    return decision;
  }
}
