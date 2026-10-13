/**
 * NeuroTwin Task Tools
 *
 * Long-running, async agent operations with progress reporting and
 * cancellation - the "Darwinian Loop" and "Proactive Healing" flows.
 *
 * Try via MCP Inspector / any task-aware client:
 *   tools/call  name="evolve_logic"       task={}
 *   tools/call  name="self_heal_unit"     task={}
 *   tasks/get       taskId=<id>
 *   tasks/result    taskId=<id>
 *   tasks/cancel    taskId=<id>
 */

import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { NeuroTwinService } from './neurotwin.service.js';
import { NeuroTwinOrchestratorService } from './neurotwin-orchestrator.service.js';
import type { UnitTelemetry } from './agents/logic-refactor.agent.js';
import type { DomainResourceSnapshot } from './agents/resource-manager.agent.js';
import { FLEET_UNITS, type FleetUnit } from './neurotwin.data.js';

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Derives UnitTelemetry from the fields FleetUnit actually has today.
// batteryPct maps directly; errorRate is estimated from throughput shortfall;
// temperatureC is a placeholder baseline nudged up for degraded units.
// Replace with real sensor fields once you add them to FleetUnit.
function toTelemetry(unit: FleetUnit): UnitTelemetry {
    return {
        unitId: unit.id,
        batteryPct: unit.batteryPct,
        temperatureC: unit.status === 'degraded' ? 48 : 30,
        errorRate: Math.max(0, (100 - unit.throughputPct) / 100),
        domain: unit.domain,
    };
}

// Simple demo resource snapshot per domain, biased by shift severity.
function toResourceSnapshot(
    domain: FleetUnit['domain'],
    severity: 'low' | 'medium' | 'high' | 'critical',
): DomainResourceSnapshot {
    const severityWeight = { low: 0.2, medium: 0.4, high: 0.7, critical: 0.9 }[severity];
    return {
        domain,
        energyPricePerKwh: 0.3 + severityWeight * 0.4,
        carbonIntensity: 0.3 + severityWeight * 0.3,
        avgTaskUrgency: 0.5,
    };
}

const EvolveLogicSchema = z.object({
    shiftId: z.string().describe('ID of the environmental shift to resolve via a full mutation cycle'),
    variantCount: z.number().int().min(2).max(8).optional().default(5)
        .describe('Number of candidate variants to generate and simulate (2-8)'),
});

const SelfHealSchema = z.object({
    unitId: z.string().describe('ID of the degraded fleet unit to self-heal'),
});

@Injectable({ deps: [NeuroTwinService, NeuroTwinOrchestratorService] })
export class NeuroTwinTaskTools {
    constructor(
        private readonly neuroTwin: NeuroTwinService,
        private readonly orchestrator: NeuroTwinOrchestratorService,
    ) { }

    /**
     * evolve_logic
     *
     * The full Darwinian mutation loop, staged out over time so progress can
     * be observed: detect -> generate candidates -> simulate in the twin ->
     * score -> select -> deploy. Also runs the 5-agent pipeline
     * (ResourceManager -> LogicRefactor -> Validator -> EthicalGuardrail) per
     * affected unit alongside the existing simulation, so you can see both trails.
     */
    @Tool({
        name: 'evolve_logic',
        description:
            'Runs the full autonomous logic-evolution loop for an environmental shift as a long-running ' +
            'operation: generates candidate logic variants, simulates each in the NeuroTwin digital twin, ' +
            'and deploys the fittest one. Pass `task: {}` to run it asynchronously and poll progress.',
        inputSchema: EvolveLogicSchema,
        taskSupport: 'optional',
        examples: {
            request: { shiftId: 'shift-heatwave-01', variantCount: 4 },
            response: { cycleId: 'cycle-example', winner: { label: 'Variant A', fitness: 87 } },
        },
    })
    async evolveLogic(args: z.infer<typeof EvolveLogicSchema>, ctx: ExecutionContext) {
        const shift = this.neuroTwin.getShiftById(args.shiftId);
        if (!shift) throw new Error(`Environmental shift not found: ${args.shiftId}`);

        ctx.logger.info('Starting logic evolution loop', { shiftId: args.shiftId, isTask: !!ctx.task });

        ctx.task?.updateProgress(`Re-confirming shift "${shift.title}" (${shift.severity} severity)...`);
        await sleep(500);
        ctx.task?.throwIfCancelled();

        ctx.task?.updateProgress(`Generating ${args.variantCount} candidate logic variants...`);
        const variants = this.neuroTwin.generateVariants(shift, args.variantCount);
        await sleep(700);
        ctx.task?.throwIfCancelled();

        for (let i = 0; i < variants.length; i++) {
            ctx.task?.updateProgress(
                `Simulating "${variants[i].strategy}" in the NeuroTwin (${i + 1}/${variants.length})...`,
            );
            await sleep(400);
            ctx.task?.throwIfCancelled();
        }

        ctx.task?.updateProgress('Scoring fitness, energy delta, and safety margin...');
        await sleep(400);

        const result = this.neuroTwin.runMutationCycle(args.shiftId, args.variantCount);

        ctx.task?.updateProgress(
            `Deploying "${result.winner.strategy}" (fitness ${result.winner.fitness}/100) to affected units...`,
        );
        await sleep(500);

        ctx.task?.updateProgress('Running 5-agent validation pipeline (ResourceManager -> LogicRefactor -> Validator -> EthicalGuardrail)...');
        const agentPipeline = shift.affectedUnitIds.map((unitId) => {
            const unit = this.neuroTwin.getUnitById(unitId);
            if (!unit) return { unitId, error: 'unit not found' };
            const telemetry = toTelemetry(unit);
            const snapshot = toResourceSnapshot(unit.domain, shift.severity);
            const fleetContext = FLEET_UNITS.map(toTelemetry);
            return this.orchestrator.runMutationPipeline(telemetry, snapshot, fleetContext);
        });
        await sleep(300);

        ctx.logger.info('Logic evolution complete', { cycleId: result.cycleId, winner: result.winner.label });

        return {
            ...result,
            shiftTitle: shift.title,
            affectedUnits: shift.affectedUnitIds,
            agentPipeline,
        };
    }

    /**
     * self_heal_unit
     *
     * Task-required: proactive healing always runs through the full staged
     * flow (detect -> reroute -> verify) since it touches live hardware state.
     * Also runs the 5-agent pipeline against the healed unit's post-heal
     * telemetry, so the healing action itself is safety/fairness-checked.
     */
    @Tool({
        name: 'self_heal_unit',
        description:
            'Proactively heals a degraded fleet unit by rerouting its operational logic (e.g. falling back ' +
            'to a nearby stationary sensor when onboard hardware fails). REQUIRES task augmentation - ' +
            'pass `task: {}`.',
        inputSchema: SelfHealSchema,
        taskSupport: 'required',
        examples: {
            request: { unitId: 'uav-03' },
            response: { unit: { id: 'uav-03', status: 'nominal' } },
        },
    })
    async selfHealUnit(args: z.infer<typeof SelfHealSchema>, ctx: ExecutionContext) {
        const unit = this.neuroTwin.getUnitById(args.unitId);
        if (!unit) throw new Error(`Fleet unit not found: ${args.unitId}`);

        ctx.logger.info('Starting self-heal', { unitId: unit.id, status: unit.status });

        ctx.task?.updateProgress(`Diagnosing ${unit.name}...`);
        this.neuroTwin.healUnit(unit.id);
        await sleep(500);
        ctx.task?.throwIfCancelled();

        ctx.task?.updateProgress(`Rerouting logic around the fault...`);
        await sleep(700);
        ctx.task?.throwIfCancelled();

        ctx.task?.updateProgress(`Verifying recovered throughput...`);
        await sleep(500);

        const healed = this.neuroTwin.completeHeal(unit.id);

        ctx.task?.updateProgress('Running 5-agent validation pipeline on the healed unit...');
        const telemetry = toTelemetry(healed);
        const snapshot = toResourceSnapshot(healed.domain, 'medium');
        const fleetContext = FLEET_UNITS.map(toTelemetry);
        const pipelineResult = this.orchestrator.runMutationPipeline(telemetry, snapshot, fleetContext);

        ctx.logger.info('Self-heal complete', { unitId: healed.id, throughputPct: healed.throughputPct });

        return { unit: healed, healedAt: new Date().toISOString(), agentPipeline: [pipelineResult] };
    }
}
