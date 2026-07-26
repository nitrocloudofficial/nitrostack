import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { ConsensusEngine } from './consensus.js';
import { DecisionService } from './decision.service.js';

const consensusEngine = new ConsensusEngine();
const decisionService = new DecisionService();

export class DecisionTools {
  @Tool({
    name: 'evaluate_consensus',
    description: 'Evaluate consensus across multiple agent results. Scores and ranks agent outputs.',
    inputSchema: z.object({
      results: z.array(
        z.object({
          agent: z.string(),
          role: z.string(),
          success: z.boolean(),
          output: z.string(),
          executionTime: z.number(),
        })
      ).describe('Array of agent execution results'),
    }),
    annotations: { readOnlyHint: true },
  })
  async evaluateConsensus(
    input: { results: Array<{ agent: string; role: string; success: boolean; output: string; executionTime: number }> },
    ctx: ExecutionContext
  ) {
    const consensus = consensusEngine.evaluate(input.results);
    return {
      score: consensus.score,
      confidence: consensus.confidence,
      selectedCount: consensus.selected.length,
      discardedCount: consensus.discarded.length,
    };
  }

  @Tool({
    name: 'make_decision',
    description: 'Run the AEIOS-X Decision Engine to produce priority, risk, and recommended action.',
    inputSchema: z.object({
      consensusScore: z.number().describe('Consensus score (0-2)'),
      consensusConfidence: z.number().describe('Consensus confidence (0-1)'),
      intents: z.array(z.string()).describe('Detected intent types'),
    }),
    annotations: { readOnlyHint: true },
  })
  async makeDecision(
    input: { consensusScore: number; consensusConfidence: number; intents: string[] },
    ctx: ExecutionContext
  ) {
    const consensus = {
      score: input.consensusScore,
      confidence: input.consensusConfidence,
      selected: [],
      discarded: [],
      summary: '',
    };
    return decisionService.decide(consensus, input.intents as any[]);
  }
}
