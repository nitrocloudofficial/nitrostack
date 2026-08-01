import { Injectable } from '@nitrostack/core';

export interface DomainResourceSnapshot {
    domain: 'logistics' | 'manufacturing' | 'energy' | 'safety';
    energyPricePerKwh: number; // current grid/tariff price
    carbonIntensity: number; // 0-1, higher = dirtier grid mix right now
    avgTaskUrgency: number; // 0-1, how time-sensitive current tasks are
}

export type ResourceCommandType = 'force-low-power' | 'force-high-throughput' | 'no-op';

export interface ResourceCommand {
    commandId: string;
    domain: string;
    commandType: ResourceCommandType;
    reason: string;
    tradeoffScore: number; // the weighted score that triggered this command
    issuedAt: string;
}

@Injectable()
export class ResourceManagerAgent {
    private commandHistory: ResourceCommand[] = [];

    /**
     * Computes a simple weighted tradeoff across energy price, carbon intensity,
     * and task urgency, then issues a command for LogicRefactorAgent to pick up.
     * Does not mutate unit logic itself - only signals intent.
     */
    evaluateDomain(snapshot: DomainResourceSnapshot): ResourceCommand {
        const { domain, energyPricePerKwh, carbonIntensity, avgTaskUrgency } = snapshot;

        // Weighted multi-objective score: high price/carbon push toward saving power,
        // high urgency pushes back toward throughput. Weights are simple and tunable.
        const costPressure = energyPricePerKwh * 0.5 + carbonIntensity * 0.5;
        const tradeoffScore = costPressure - avgTaskUrgency;

        let commandType: ResourceCommandType = 'no-op';
        let reason = 'Cost pressure and urgency are balanced - no command issued.';

        if (tradeoffScore > 0.3) {
            commandType = 'force-low-power';
            reason = `High cost pressure (energy=${energyPricePerKwh}, carbon=${carbonIntensity}) outweighs task urgency (${avgTaskUrgency}) - forcing low-power strategy.`;
        } else if (tradeoffScore < -0.3) {
            commandType = 'force-high-throughput';
            reason = `Task urgency (${avgTaskUrgency}) outweighs cost pressure - forcing high-throughput strategy.`;
        }

        const command: ResourceCommand = {
            commandId: `${domain}-${Date.now()}`,
            domain,
            commandType,
            reason,
            tradeoffScore,
            issuedAt: new Date().toISOString(),
        };

        this.commandHistory.push(command);
        return command;
    }

    getCommandHistory(domain?: string): ResourceCommand[] {
        if (!domain) return this.commandHistory;
        return this.commandHistory.filter((c) => c.domain === domain);
    }
}
