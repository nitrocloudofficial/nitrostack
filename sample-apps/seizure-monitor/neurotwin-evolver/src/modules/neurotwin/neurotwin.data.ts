/**
 * NeuroTwin Evolver - Domain Data
 *
 * Models a small Industry 5.0 deployment: a swarm of UAV/floor units operating
 * under a shared "NeuroTwin" (neural digital twin), plus the environmental
 * shift events that force the agent to rewrite its own operational logic.
 */

export type UnitDomain = 'logistics' | 'manufacturing' | 'energy' | 'safety';
export type UnitStatus = 'nominal' | 'degraded' | 'healing' | 'offline';

export interface FleetUnit {
    id: string;
    name: string;
    domain: UnitDomain;
    kind: string; // e.g. "UAV", "AGV", "Conveyor Cell", "Battery Rack"
    status: UnitStatus;
    coords: [number, number]; // normalized 0-100 grid position for the twin map
    batteryPct: number;
    throughputPct: number; // % of nominal throughput
    lastMutation?: string; // id of the last logic mutation deployed to this unit
    notes?: string;
}

export interface EnvironmentalShift {
    id: string;
    title: string;
    category: 'weather' | 'regulatory' | 'hardware' | 'market';
    detectedAt: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedUnitIds: string[];
    description: string;
    status: 'detected' | 'mutating' | 'resolved';
    resolutionNotes?: string;
}

export interface AlgorithmVariant {
    id: string;
    label: string;
    strategy: string;
    fitness: number; // 0-100, computed in the digital twin simulation
    energyDelta: number; // % change vs. baseline
    safetyMargin: number; // % headroom vs. safety threshold
    latencyMs: number;
    deployed: boolean;
}

export interface MutationCycleResult {
    cycleId: string;
    shiftId: string;
    variants: AlgorithmVariant[];
    winner: AlgorithmVariant;
    completedAt: string;
}

// --- Fleet ------------------------------------------------------------------

export const FLEET_UNITS: FleetUnit[] = [
    {
        id: 'uav-01', name: 'UAV-01 "Scout"', domain: 'logistics', kind: 'UAV',
        status: 'degraded', coords: [18, 22], batteryPct: 41, throughputPct: 68,
        notes: 'Battery drain 30% faster than baseline under heatwave conditions.',
    },
    {
        id: 'uav-02', name: 'UAV-02 "Courier"', domain: 'logistics', kind: 'UAV',
        status: 'nominal', coords: [34, 40], batteryPct: 88, throughputPct: 97,
    },
    {
        id: 'uav-03', name: 'UAV-03 "Relay"', domain: 'logistics', kind: 'UAV',
        status: 'healing', coords: [52, 18], batteryPct: 63, throughputPct: 74,
        notes: 'Navigation sensor fault - rerouted onto stationary-camera fallback.',
    },
    {
        id: 'agv-04', name: 'AGV-04 "Floor Runner"', domain: 'manufacturing', kind: 'AGV',
        status: 'nominal', coords: [66, 55], batteryPct: 79, throughputPct: 91,
    },
    {
        id: 'cell-05', name: 'Conveyor Cell 5', domain: 'manufacturing', kind: 'Conveyor Cell',
        status: 'nominal', coords: [72, 70], batteryPct: 100, throughputPct: 95,
    },
    {
        id: 'batt-06', name: 'Battery Rack B6', domain: 'energy', kind: 'Battery Rack',
        status: 'degraded', coords: [20, 78], batteryPct: 54, throughputPct: 60,
        notes: 'Carbon-tax policy shift changes optimal charge/discharge schedule.',
    },
    {
        id: 'safe-07', name: 'Safety Gate 7', domain: 'safety', kind: 'Safety Gate',
        status: 'nominal', coords: [46, 82], batteryPct: 100, throughputPct: 100,
    },
];

// --- Environmental Shifts ----------------------------------------------------

export const ENVIRONMENTAL_SHIFTS: EnvironmentalShift[] = [
    {
        id: 'shift-heatwave-01',
        title: 'Sudden regional heatwave',
        category: 'weather',
        detectedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        severity: 'high',
        affectedUnitIds: ['uav-01'],
        description:
            'Ambient temperature spiked 14 degrees C above forecast. UAV-01 battery drain is running ~30% ' +
            'faster than the trained policy expects - flight-path and payload logic was never trained on this regime.',
        status: 'detected',
    },
    {
        id: 'shift-sensor-fault-01',
        title: 'Nav sensor degradation on UAV-03',
        category: 'hardware',
        detectedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        severity: 'medium',
        affectedUnitIds: ['uav-03'],
        description:
            'Onboard LIDAR is returning noisy returns above 20m. Agent is mid-mutation, rerouting ' +
            'navigation logic to fuse in a nearby stationary camera feed.',
        status: 'mutating',
    },
    {
        id: 'shift-carbon-tax-01',
        title: 'Overnight carbon-tax policy change',
        category: 'regulatory',
        detectedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        severity: 'critical',
        affectedUnitIds: ['batt-06', 'agv-04', 'cell-05'],
        description:
            'A new carbon levy on peak-grid draw took effect at midnight. The energy reward function ' +
            'used by Battery Rack B6 and downstream manufacturing cells was optimized for the old tariff.',
        status: 'detected',
    },
];

// --- In-memory simulation state (mutated at runtime) -------------------------

export const MUTATION_HISTORY: MutationCycleResult[] = [];

export const STRATEGY_POOL = [
    'Conservative reroute + reduced payload',
    'Adaptive throttling with dynamic reward reweighting',
    'Symbolic safety override + neural fine-tune',
    'Stationary-sensor fusion fallback',
    'Off-peak-shifted charge/discharge schedule',
    'Multi-agent renegotiation of task queue',
    'Redundant path graph with live cost re-scoring',
];

let shiftCounter = ENVIRONMENTAL_SHIFTS.length;
export function nextShiftId(): string {
    shiftCounter += 1;
    return `shift-live-${String(shiftCounter).padStart(2, '0')}`;
}

export interface Waypoint {
    id: string;
    coords: [number, number];
    altitudeM: number;
    taskType: 'scan' | 'deliver' | 'inspect' | 'return';
}

export interface NoFlyZone {
    id: string;
    name: string;
    center: [number, number];
    radiusPct: number;
}

export const NO_FLY_ZONES: NoFlyZone[] = [
    { id: 'nfz-01', name: 'Airport approach corridor', center: [80, 20], radiusPct: 12 },
    { id: 'nfz-02', name: 'Residential no-fly buffer', center: [15, 60], radiusPct: 8 },
];

export interface PerceptionReading {
    unitId: string;
    obstacleDetected: boolean;
    visibilityPct: number;
    batteryPct: number;
    timestamp: string;
}

export interface MissionAssignment {
    unitId: string;
    waypoints: Waypoint[];
}

export interface SafetyAbort {
    unitId: string;
    reason: string;
}

export interface MissionReport {
    missionId: string;
    goal: string;
    assignments: MissionAssignment[];
    collisionsAvoided: number;
    safetyAborts: SafetyAbort[];
    perception: PerceptionReading[];
    status: 'completed' | 'aborted';
    completedAt: string;
}

let missionCounter = 0;
export function nextMissionId(): string {
    missionCounter += 1;
    return `mission-${String(missionCounter).padStart(2, '0')}`;
}
