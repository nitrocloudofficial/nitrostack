import { Injectable } from '@nitrostack/core';

export interface UnitTelemetry {
  unitId: string;
  batteryPct: number;
  temperatureC: number;
  errorRate: number; // 0-1
  domain: 'logistics' | 'manufacturing' | 'energy' | 'safety';
}

export interface MutationProposal {
  unitId: string;
  proposalId: string;
  strategyName: string;
  description: string;
  estimatedFitness: number; // 0-1, this agent's own self-scored guess
  triggeredBy: string; // which telemetry signal caused this proposal
  timestamp: string;
}

@Injectable()
export class LogicRefactorAgent {
  private mutationHistory: Map<string, MutationProposal[]> = new Map();

  /**
   * Looks at one unit's telemetry and proposes a logic mutation.
   * This does NOT deploy anything — it only proposes.
   * The Validator agent must approve before ResourceManager/pipeline deploys it.
   */
  proposeMutation(telemetry: UnitTelemetry): MutationProposal {
    const { unitId, batteryPct, temperatureC, errorRate, domain } = telemetry;

    let strategyName = 'default-logic';
    let triggeredBy = 'none';
    let estimatedFitness = 0.5;

    if (batteryPct < 20) {
      strategyName = 'low-power-gliding-mode';
      triggeredBy = `batteryPct=${batteryPct}`;
      estimatedFitness = 0.7;
    } else if (temperatureC > 45) {
      strategyName = 'thermal-throttle-mode';
      triggeredBy = `temperatureC=${temperatureC}`;
      estimatedFitness = 0.65;
    } else if (errorRate > 0.3) {
      strategyName = 'redundant-sensor-fallback';
      triggeredBy = `errorRate=${errorRate}`;
      estimatedFitness = 0.6;
    }

    const proposal: MutationProposal = {
      unitId,
      proposalId: `${unitId}-${Date.now()}`,
      strategyName,
      description: `Proposed switch to "${strategyName}" for unit ${unitId} in domain ${domain}`,
      estimatedFitness,
      triggeredBy,
      timestamp: new Date().toISOString(),
    };

    if (!this.mutationHistory.has(unitId)) {
      this.mutationHistory.set(unitId, []);
    }
    this.mutationHistory.get(unitId)!.push(proposal);

    return proposal;
  }

  getMutationHistory(unitId: string): MutationProposal[] {
    return this.mutationHistory.get(unitId) ?? [];
  }
}
