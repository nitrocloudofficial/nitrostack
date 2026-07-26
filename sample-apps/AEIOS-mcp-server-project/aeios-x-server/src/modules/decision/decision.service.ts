import type { ConsensusResult } from './consensus.js';
import type { IntentType } from '../intent/intent.service.js';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface EnterpriseDecision {
  priority: Priority;
  risk: RiskLevel;
  confidence: number;
  recommendedAction: string;
  reasoning: string;
}

export class DecisionService {
  decide(consensus: ConsensusResult, intents: IntentType[]): EnterpriseDecision {
    const priority = this.determinePriority(intents);
    let risk = this.determineRisk(intents);
    const confidence = consensus.confidence;

    if (confidence < 0.6) risk = 'HIGH';
    else if (confidence < 0.8 && risk === 'LOW') risk = 'MEDIUM';

    const recommendedAction = this.buildRecommendation(intents, consensus);

    return {
      priority,
      risk,
      confidence,
      recommendedAction,
      reasoning: `Based on ${intents.join(', ')} intents with ${(confidence * 100).toFixed(0)}% confidence. ` +
        `${consensus.selected.length} agents contributed, ${consensus.discarded.length} failed.`,
    };
  }

  private determinePriority(intents: IntentType[]): Priority {
    if (intents.includes('SECURITY')) return 'HIGH';
    if (intents.includes('PLANNING') || intents.includes('BUSINESS')) return 'MEDIUM';
    if (intents.includes('DEVOPS')) return 'MEDIUM';
    return 'LOW';
  }

  private determineRisk(intents: IntentType[]): RiskLevel {
    if (intents.includes('SECURITY')) return 'HIGH';
    if (intents.includes('DEVOPS') || intents.includes('SQL')) return 'MEDIUM';
    return 'LOW';
  }

  private buildRecommendation(intents: IntentType[], consensus: ConsensusResult): string {
    if (consensus.selected.length === 0) {
      return 'No actionable recommendations — all agents failed.';
    }
    const topAgent = consensus.selected[0]!;
    return `Proceed with ${topAgent.role} recommendation. Confidence: ${(consensus.confidence * 100).toFixed(0)}%.`;
  }
}
