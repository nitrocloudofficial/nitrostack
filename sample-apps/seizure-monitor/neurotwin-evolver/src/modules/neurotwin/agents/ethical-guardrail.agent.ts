import { Injectable } from '@nitrostack/core';
import { MutationProposal, UnitTelemetry } from './logic-refactor.agent.js';

export interface EthicalCheckResult {
    proposalId: string;
    unitId: string;
    approved: boolean;
    fairnessScore: number; // 0-1, higher = more equitable
    flaggedConcerns: string[];
    checkedAt: string;
}

interface EquityRule {
    name: string;
    // returns a fairness penalty 0 (fine) to 1 (severe concern)
    evaluate: (telemetry: UnitTelemetry, proposal: MutationProposal, fleetContext: UnitTelemetry[]) => number;
}

@Injectable()
export class EthicalGuardrailAgent {
    private checkHistory: EthicalCheckResult[] = [];

    private readonly rules: EquityRule[] = [
        {
            name: 'battery-equity',
            // Flag if this unit is being pushed into an aggressive strategy while
            // it has meaningfully less battery than its same-domain peers.
            evaluate: (telemetry, _proposal, fleetContext) => {
                const peers = fleetContext.filter(
                    (u) => u.domain === telemetry.domain && u.unitId !== telemetry.unitId,
                );
                if (peers.length === 0) return 0;
                const avgPeerBattery = peers.reduce((sum, u) => sum + u.batteryPct, 0) / peers.length;
                const gap = avgPeerBattery - telemetry.batteryPct;
                // gap > 25 percentage points below peers = meaningful inequity
                return gap > 25 ? Math.min(1, gap / 100) : 0;
            },
        },
        {
            name: 'error-burden-equity',
            // Flag if a unit already carrying a high error rate is being asked
            // to adopt a strategy with a low estimated fitness (i.e. more risk
            // piled onto an already-struggling unit).
            evaluate: (telemetry, proposal) => {
                if (telemetry.errorRate > 0.4 && proposal.estimatedFitness < 0.55) {
                    return telemetry.errorRate; // higher error rate = higher concern
                }
                return 0;
            },
        },
        {
            name: 'safety-domain-precaution',
            // Extra caution for safety-domain units: any non-trivial fairness
            // concern at all should block, since consequences are higher there.
            evaluate: (telemetry, _proposal, _fleetContext) => {
                return telemetry.domain === 'safety' ? 0 : 0; // hook for future domain-specific rules
            },
        },
    ];

    /**
     * Runs a proposed mutation against fairness/equity constraints across the
     * fleet, not just the single unit's own telemetry. Complements (does not
     * replace) NeuroTwinValidatorAgent's hard safety rules.
     */
    evaluate(
        telemetry: UnitTelemetry,
        proposal: MutationProposal,
        fleetContext: UnitTelemetry[],
    ): EthicalCheckResult {
        const concernScores = this.rules.map((rule) => ({
            name: rule.name,
            score: rule.evaluate(telemetry, proposal, fleetContext),
        }));

        const flaggedConcerns = concernScores
            .filter((c) => c.score > 0.15)
            .map((c) => c.name);

        const avgConcern =
            concernScores.reduce((sum, c) => sum + c.score, 0) / concernScores.length;
        const fairnessScore = Math.max(0, 1 - avgConcern);

        const result: EthicalCheckResult = {
            proposalId: proposal.proposalId,
            unitId: proposal.unitId,
            approved: flaggedConcerns.length === 0,
            fairnessScore: Math.round(fairnessScore * 100) / 100,
            flaggedConcerns,
            checkedAt: new Date().toISOString(),
        };

        this.checkHistory.push(result);
        return result;
    }

    getCheckHistory(unitId?: string): EthicalCheckResult[] {
        if (!unitId) return this.checkHistory;
        return this.checkHistory.filter((c) => c.unitId === unitId);
    }
}
