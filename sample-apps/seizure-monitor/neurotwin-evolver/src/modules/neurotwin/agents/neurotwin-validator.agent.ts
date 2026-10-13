import { Injectable } from '@nitrostack/core';
import { MutationProposal, UnitTelemetry } from './logic-refactor.agent.js';

export interface ValidationResult {
    proposalId: string;
    unitId: string;
    approved: boolean;
    violatedRules: string[];
    checkedAt: string;
}

interface SymbolicRule {
    name: string;
    check: (telemetry: UnitTelemetry, proposal: MutationProposal) => boolean; // true = PASSES
}

@Injectable()
export class NeuroTwinValidatorAgent {
    private validationHistory: ValidationResult[] = [];

    // Symbolic safety rules - hard constraints, not learned/tunable.
    private readonly rules: SymbolicRule[] = [
        {
            name: 'min-battery-floor',
            // Never approve a mutation that would let a unit operate below 10% battery
            check: (telemetry) => telemetry.batteryPct >= 10,
        },
        {
            name: 'max-thermal-ceiling',
            // Reject if temperature is already past a hard safety ceiling
            check: (telemetry) => telemetry.temperatureC <= 60,
        },
        {
            name: 'max-error-rate',
            // Reject if the unit's error rate is too high to trust a live logic swap
            check: (telemetry) => telemetry.errorRate <= 0.75,
        },
        {
            name: 'safety-domain-lockout',
            // Extra caution: safety-domain units need a higher fitness bar before mutating
            check: (_telemetry, proposal) =>
                proposal.estimatedFitness >= 0.5 || _telemetry.domain !== 'safety',
        },
    ];

    /**
     * Runs a proposed mutation against the symbolic rule set.
     * Approves only if every rule passes.
     */
    validate(telemetry: UnitTelemetry, proposal: MutationProposal): ValidationResult {
        const violatedRules = this.rules
            .filter((rule) => !rule.check(telemetry, proposal))
            .map((rule) => rule.name);

        const result: ValidationResult = {
            proposalId: proposal.proposalId,
            unitId: proposal.unitId,
            approved: violatedRules.length === 0,
            violatedRules,
            checkedAt: new Date().toISOString(),
        };

        this.validationHistory.push(result);
        return result;
    }

    getValidationHistory(unitId?: string): ValidationResult[] {
        if (!unitId) return this.validationHistory;
        return this.validationHistory.filter((v) => v.unitId === unitId);
    }
}
