import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { NeuroTwinService } from './neurotwin.service.js';
import { NeuroTwinOrchestratorService } from './neurotwin-orchestrator.service.js';
import type { UnitTelemetry } from './agents/logic-refactor.agent.js';
import type { DomainResourceSnapshot } from './agents/resource-manager.agent.js';
import type { CommsHealthReading } from './agents/protocol-evolver.agent.js';
import { FLEET_UNITS, type FleetUnit } from './neurotwin.data.js';

function ntWidget(route: string) {
    return {
        route,
        prefersBorder: true,
    };
}

// Same derivation logic as neurotwin.tasks.ts - kept local to this file
// since NitroStack modules don't share a common "helpers" import here yet.
function toTelemetry(unit: FleetUnit): UnitTelemetry {
    return {
        unitId: unit.id,
        batteryPct: unit.batteryPct,
        temperatureC: unit.status === 'degraded' ? 48 : 30,
        errorRate: Math.max(0, (100 - unit.throughputPct) / 100),
        domain: unit.domain,
    };
}

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

// Derives a synthetic comms-health reading from fields FleetUnit already has.
// throughputPct is used as a proxy for signal strength; degraded/offline
// units get penalized on latency and packet loss. Replace with real radio
// telemetry once you have it.
function toCommsHealth(unit: FleetUnit): CommsHealthReading {
    const signalStrength = Math.max(0, Math.min(1, unit.throughputPct / 100));
    const statusPenalty = unit.status === 'offline' ? 0.6 : unit.status === 'degraded' ? 0.3 : 0;
    return {
        unitId: unit.id,
        signalStrength: Math.max(0, signalStrength - statusPenalty),
        latencyMs: 50 + statusPenalty * 500,
        packetLossPct: Math.min(1, statusPenalty * 0.8),
    };
}

const FleetTwinSchema = z.object({
    domain: z.enum(['logistics', 'manufacturing', 'energy', 'safety']).optional()
        .describe('Filter the twin view to a single domain'),
    status: z.enum(['nominal', 'degraded', 'healing', 'offline']).optional()
        .describe('Filter to units in a specific status'),
});

const ShiftMonitorSchema = z.object({
    onlyActive: z.boolean().optional().default(true)
        .describe('Only show shifts that are not yet resolved'),
});

const MutationCycleSchema = z.object({
    shiftId: z.string().describe('ID of the environmental shift to run a mutation cycle for'),
    variantCount: z.number().int().min(2).max(8).optional().default(4)
        .describe('How many candidate logic variants to generate and simulate (2-8)'),
});

const UnitDetailSchema = z.object({
    unitId: z.string().describe('ID of the fleet unit to inspect'),
});

const SwarmCommsSchema = z.object({
    domain: z.enum(['logistics', 'manufacturing', 'energy', 'safety']).optional()
        .describe('Restrict the comms-health check to a single domain (defaults to whole fleet)'),
});

const InjectShiftSchema = z.object({
    title: z.string().describe('Short description of the new environmental shift'),
    category: z.enum(['weather', 'regulatory', 'hardware', 'market']).describe('Type of shift detected'),
    severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Severity of the shift'),
    affectedUnitIds: z.array(z.string()).min(1).describe('IDs of fleet units affected by this shift'),
    description: z.string().describe('Fuller description of what changed and why it matters'),
});

@Injectable({ deps: [NeuroTwinService, NeuroTwinOrchestratorService] })
export class NeuroTwinTools {
    constructor(
        private readonly neuroTwin: NeuroTwinService,
        private readonly orchestrator: NeuroTwinOrchestratorService,
    ) { }

    @Tool({
        name: 'view_fleet_twin',
        description:
            'Display the live NeuroTwin digital-twin map of the fleet - UAVs, AGVs, conveyor cells, ' +
            'battery racks and safety gates - with real-time status, battery, and throughput across ' +
            'logistics, manufacturing, energy, and safety domains.',
        inputSchema: FleetTwinSchema,
        examples: {
            request: {},
            response: { units: [], snapshot: {}, filters: {} },
        },
    })
    @Widget(ntWidget('fleet-twin'))
    async viewFleetTwin(args: z.infer<typeof FleetTwinSchema>, ctx: ExecutionContext) {
        const units = this.neuroTwin.getFleetFiltered(args);
        const snapshot = this.neuroTwin.getOrchestrationSnapshot();
        ctx.logger.info('Rendering fleet twin', { count: units.length, filters: args });
        return { units, snapshot, filters: args };
    }

    @Tool({
        name: 'monitor_environmental_shifts',
        description:
            'List environmental shifts the agent has detected (weather, regulatory, hardware, market) ' +
            'that its original training did not anticipate, and their current mutation/resolution status.',
        inputSchema: ShiftMonitorSchema,
        examples: {
            request: { onlyActive: true },
            response: { shifts: [] },
        },
    })
    @Widget(ntWidget('fleet-twin'))
    async monitorEnvironmentalShifts(args: z.infer<typeof ShiftMonitorSchema>, ctx: ExecutionContext) {
        const shifts = args.onlyActive ? this.neuroTwin.getActiveShifts() : this.neuroTwin.getShifts();
        const units = this.neuroTwin.getFleet();
        const snapshot = this.neuroTwin.getOrchestrationSnapshot();
        ctx.logger.info('Monitoring environmental shifts', { count: shifts.length });
        return { shifts, units, snapshot, filters: args };
    }

    @Tool({
        name: 'run_mutation_cycle',
        description:
            'Runs a Safe Test-Driven Mutation Cycle for a detected environmental shift: generates several ' +
            'candidate logic variants, simulates each in the NeuroTwin digital twin, scores them on fitness, ' +
            'energy delta, and safety margin, then deploys the fittest one to the affected units. Also runs ' +
            'the 5-agent validation pipeline (ResourceManager -> LogicRefactor -> Validator -> EthicalGuardrail) ' +
            'per affected unit.',
        inputSchema: MutationCycleSchema,
        examples: {
            request: { shiftId: 'shift-heatwave-01', variantCount: 4 },
            response: { cycleId: 'cycle-example', shiftId: 'shift-heatwave-01', variants: [], winner: {} },
        },
    })
    @Widget(ntWidget('mutation-lab'))
    async runMutationCycle(args: z.infer<typeof MutationCycleSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Running mutation cycle', args);
        const result = this.neuroTwin.runMutationCycle(args.shiftId, args.variantCount);
        const shift = this.neuroTwin.getShiftById(args.shiftId);

        const agentPipeline = (shift?.affectedUnitIds ?? []).map((unitId) => {
            const unit = this.neuroTwin.getUnitById(unitId);
            if (!unit) return { unitId, error: 'unit not found' };
            const telemetry = toTelemetry(unit);
            const snapshot = toResourceSnapshot(unit.domain, shift?.severity ?? 'medium');
            const fleetContext = FLEET_UNITS.map(toTelemetry);
            return this.orchestrator.runMutationPipeline(telemetry, snapshot, fleetContext);
        });

        ctx.logger.info('Mutation cycle complete', {
            cycleId: result.cycleId,
            winner: result.winner.label,
            fitness: result.winner.fitness,
        });
        return { ...result, shift, agentPipeline };
    }

    @Tool({
        name: 'get_unit_detail',
        description:
            'Display detailed telemetry and mutation history for a single fleet unit, including its ' +
            'current status, battery, throughput, domain, and the last logic mutation deployed to it.',
        inputSchema: UnitDetailSchema,
        examples: {
            request: { unitId: 'uav-01' },
            response: { unit: {}, relatedShifts: [], history: [] },
        },
    })
    @Widget(ntWidget('unit-detail'))
    async getUnitDetail(args: z.infer<typeof UnitDetailSchema>, ctx: ExecutionContext) {
        const unit = this.neuroTwin.getUnitById(args.unitId);
        if (!unit) throw new Error(`Fleet unit not found: ${args.unitId}`);

        const relatedShifts = this.neuroTwin.getShifts().filter((s) => s.affectedUnitIds.includes(unit.id));
        const history = this.neuroTwin.getMutationHistory().filter((m) => m.shiftId
            && relatedShifts.some((s) => s.id === m.shiftId));

        ctx.logger.info('Showing unit detail', { unitId: unit.id, status: unit.status });
        return { unit, relatedShifts, history };
    }

    @Tool({
        name: 'check_swarm_comms',
        description:
            'Evaluates communication health across the fleet swarm and decides whether the Protocol-Evolver ' +
            'agent should switch topology (leader-follower / mesh / cellular) to route around degraded nodes. ' +
            'Returns null topologyDecision if the swarm is healthy and no change is needed.',
        inputSchema: SwarmCommsSchema,
        examples: {
            request: {},
            response: { currentTopology: 'leader-follower', topologyDecision: null, readings: [] },
        },
    })
    async checkSwarmComms(args: z.infer<typeof SwarmCommsSchema>, ctx: ExecutionContext) {
        const units = args.domain
            ? this.neuroTwin.getFleet().filter((u) => u.domain === args.domain)
            : this.neuroTwin.getFleet();

        const readings = units.map(toCommsHealth);
        const topologyDecision = this.orchestrator.evaluateSwarmComms(readings);
        const currentTopology = this.orchestrator.getCurrentTopology();

        ctx.logger.info('Checked swarm comms', {
            unitCount: units.length,
            currentTopology,
            changed: !!topologyDecision,
        });

        return { currentTopology, topologyDecision, readings };
    }

    @Tool({
        name: 'inject_environmental_shift',
        description: 'Manually reports a new environmental shift for the swarm to react to (for demo/testing). Adds it to the active shift list so evolve_logic or run_mutation_cycle can then resolve it.',
        inputSchema: InjectShiftSchema,
        examples: {
            request: { title: 'Sudden downpour', category: 'weather', severity: 'medium', affectedUnitIds: ['uav-01'], description: 'Heavy rain reduces visibility and traction for ground units.' },
            response: { id: 'shift-example', status: 'detected' },
        },
    })
    async injectEnvironmentalShift(args: z.infer<typeof InjectShiftSchema>, ctx: ExecutionContext) {
        const shift = this.neuroTwin.detectShift(args);
        ctx.logger.info('Injected environmental shift', { id: shift.id, title: shift.title });
        return shift;
    }
}



