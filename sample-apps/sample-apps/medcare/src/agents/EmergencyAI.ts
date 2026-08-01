/**
 * EmergencyAI
 *
 * Single responsibility: emergency card generation and critical risk
 * assessment. Same hard constraints as the other agents: no database,
 * file, or auth access; never calls another agent.
 */

import type { IAIAgent } from '../interfaces/gateway.interfaces.js';
import type { AITaskName } from '../types/gateway.types.js';

export interface EmergencyAnalysisInput {
  bloodType: string;
  criticalAllergies: Array<{ substance: string; reaction: string; severity: string }>;
  criticalConditions: Array<{ name: string; severity: string }>;
  activeMedicationNames: string[];
  geneticAlerts: Array<{ gene: string; phenotype: string; emergencyRelevance: string }>;
}

export interface EmergencyAnalysisOutput {
  riskLevel: 'critical' | 'elevated' | 'standard';
  headline: string;
  keyAlerts: string[];
}

export class EmergencyAI implements IAIAgent<EmergencyAnalysisInput, EmergencyAnalysisOutput> {
  readonly name = 'EmergencyAI';
  readonly handles: AITaskName[] = ['emergency-analysis'];

  async run(input: EmergencyAnalysisInput): Promise<EmergencyAnalysisOutput> {
    const keyAlerts: string[] = [];

    for (const allergy of input.criticalAllergies) {
      keyAlerts.push(`Allergy: ${allergy.substance} (${allergy.severity}) — reaction: ${allergy.reaction}.`);
    }
    for (const condition of input.criticalConditions) {
      keyAlerts.push(`Condition: ${condition.name} (${condition.severity}).`);
    }
    for (const alert of input.geneticAlerts) {
      keyAlerts.push(`Genetic: ${alert.gene} — ${alert.phenotype}. ${alert.emergencyRelevance}`);
    }

    const hasSevereAllergy = input.criticalAllergies.some(
      a => a.severity === 'severe' || a.severity === 'high'
    );
    const hasHighSeverityCondition = input.criticalConditions.some(c => c.severity === 'high');

    let riskLevel: EmergencyAnalysisOutput['riskLevel'] = 'standard';
    if (hasSevereAllergy || hasHighSeverityCondition) riskLevel = 'critical';
    else if (input.criticalConditions.length > 0 || input.geneticAlerts.length > 0) riskLevel = 'elevated';

    const headline =
      riskLevel === 'critical'
        ? 'CRITICAL: severe allergy or high-severity condition on file — review before treatment.'
        : riskLevel === 'elevated'
          ? 'ELEVATED: active conditions or genetic alerts require attention.'
          : 'STANDARD: no critical flags on file.';

    return { riskLevel, headline, keyAlerts };
  }
}
