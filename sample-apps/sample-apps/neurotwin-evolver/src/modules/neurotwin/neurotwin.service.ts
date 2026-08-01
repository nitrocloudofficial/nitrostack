import { Injectable } from '@nitrostack/core';
import {
    FLEET_UNITS,
    ENVIRONMENTAL_SHIFTS,
    MUTATION_HISTORY,
    STRATEGY_POOL,
    nextShiftId,
    type FleetUnit,
    type EnvironmentalShift,
    type AlgorithmVariant,
    type MutationCycleResult,
} from './neurotwin.data.js';

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

function pickN<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const out: T[] = [];
    while (out.length < n && copy.length > 0) {
        const i = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(i, 1)[0]);
    }
    return out;
}

@Injectable()
export class NeuroTwinService {
    // -- Fleet ------------------------------------------------------------

    getFleet(): FleetUnit[] {
        return FLEET_UNITS;
    }

    getUnitById(id: string): FleetUnit | undefined {
        return FLEET_UNITS.find((u) => u.id === id);
    }

    getFleetFiltered(filters: { domain?: string; status?: string }): FleetUnit[] {
        let units = [...FLEET_UNITS];
        if (filters.domain) units = units.filter((u) => u.domain === filters.domain);
        if (filters.status) units = units.filter((u) => u.status === filters.status);
        return units;
    }

    /** Cross-domain KPI snapshot - the thing NTE optimizes as one problem. */
    getOrchestrationSnapshot() {
        const byDomain: Record<string, { units: number; avgThroughput: number; avgBattery: number }> = {};
        for (const unit of FLEET_UNITS) {
            const bucket = (byDomain[unit.domain] ??= { units: 0, avgThroughput: 0, avgBattery: 0 });
            bucket.units += 1;
            bucket.avgThroughput += unit.throughputPct;
            bucket.avgBattery += unit.batteryPct;
        }
        for (const key of Object.keys(byDomain)) {
            byDomain[key].avgThroughput = round1(byDomain[key].avgThroughput / byDomain[key].units);
            byDomain[key].avgBattery = round1(byDomain[key].avgBattery / byDomain[key].units);
        }
        const degradedCount = FLEET_UNITS.filter((u) => u.status !== 'nominal').length;
        return {
            totalUnits: FLEET_UNITS.length,
            degradedCount,
            healthyCount: FLEET_UNITS.length - degradedCount,
            byDomain,
            activeShifts: ENVIRONMENTAL_SHIFTS.filter((s) => s.status !== 'resolved').length,
        };
    }

    // -- Environmental shifts --------------------------------------------

    getShifts(): EnvironmentalShift[] {
        return ENVIRONMENTAL_SHIFTS;
    }

    getShiftById(id: string): EnvironmentalShift | undefined {
        return ENVIRONMENTAL_SHIFTS.find((s) => s.id === id);
    }

    getActiveShifts(): EnvironmentalShift[] {
        return ENVIRONMENTAL_SHIFTS.filter((s) => s.status !== 'resolved');
    }

    // -- Mutation cycle (Darwinian logic synthesis) ----------------------

    /**
     * Generates candidate logic variants for a shift, scores each one as if
     * simulated in the NeuroTwin digital twin, and returns the ranked field.
     * This is the synchronous "one-shot" version used by the regular tool.
     */
    generateVariants(shift: EnvironmentalShift, count = 4): AlgorithmVariant[] {
        const strategies = pickN(STRATEGY_POOL, Math.min(count, STRATEGY_POOL.length));
        const severityPenalty = { low: 0, medium: 5, high: 12, critical: 20 }[shift.severity];

        return strategies.map((strategy, i) => {
            const base = 60 + Math.random() * 30 - severityPenalty * 0.3;
            const fitness = Math.max(5, Math.min(99, round1(base + (i === 0 ? 4 : 0))));
            return {
                id: `${shift.id}-var-${i + 1}`,
                label: `Variant ${String.fromCharCode(65 + i)}`,
                strategy,
                fitness,
                energyDelta: round1((Math.random() - 0.5) * 20),
                safetyMargin: round1(10 + Math.random() * 25 - severityPenalty * 0.4),
                latencyMs: Math.round(80 + Math.random() * 220),
                deployed: false,
            };
        }).sort((a, b) => b.fitness - a.fitness);
    }

    /** Runs a full mutation cycle for a shift: generate -> simulate -> select winner -> deploy. */
    runMutationCycle(shiftId: string, variantCount = 4): MutationCycleResult {
        const shift = this.getShiftById(shiftId);
        if (!shift) throw new Error(`Environmental shift not found: ${shiftId}`);

        const variants = this.generateVariants(shift, variantCount);
        const winner = variants[0];
        winner.deployed = true;

        // Update shift + affected unit state to reflect the deployed mutation.
        shift.status = 'resolved';
        shift.resolutionNotes = `Deployed "${winner.strategy}" (fitness ${winner.fitness}/100) after ${variants.length}-way mutation cycle.`;
        for (const unitId of shift.affectedUnitIds) {
            const unit = this.getUnitById(unitId);
            if (unit) {
                unit.status = 'nominal';
                unit.throughputPct = Math.min(100, round1(unit.throughputPct + 15));
                unit.lastMutation = winner.id;
            }
        }

        const result: MutationCycleResult = {
            cycleId: `cycle-${Date.now().toString(36)}`,
            shiftId,
            variants,
            winner,
            completedAt: new Date().toISOString(),
        };
        MUTATION_HISTORY.unshift(result);
        return result;
    }

    getMutationHistory(): MutationCycleResult[] {
        return MUTATION_HISTORY;
    }

    /** Self-healing: reroute a degraded unit's logic without a full mutation cycle. */
    healUnit(unitId: string): FleetUnit {
        const unit = this.getUnitById(unitId);
        if (!unit) throw new Error(`Fleet unit not found: ${unitId}`);
        unit.status = 'healing';
        return unit;
    }

    completeHeal(unitId: string): FleetUnit {
        const unit = this.getUnitById(unitId);
        if (!unit) throw new Error(`Fleet unit not found: ${unitId}`);
        unit.status = 'nominal';
        unit.throughputPct = Math.min(100, round1(unit.throughputPct + 20));
        unit.batteryPct = Math.min(100, round1(unit.batteryPct + 10));
        return unit;
    }

    detectShift(input: {
        title: string;
        category: EnvironmentalShift['category'];
        severity: EnvironmentalShift['severity'];
        affectedUnitIds: string[];
        description: string;
    }): EnvironmentalShift {
        const shift: EnvironmentalShift = {
            id: nextShiftId(),
            title: input.title,
            category: input.category,
            severity: input.severity,
            detectedAt: new Date().toISOString(),
            affectedUnitIds: input.affectedUnitIds,
            description: input.description,
            status: 'detected',
        };
        ENVIRONMENTAL_SHIFTS.unshift(shift);
        return shift;
    }
}



