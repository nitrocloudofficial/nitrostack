import {
    FLEET_UNITS,
    NO_FLY_ZONES,
    Waypoint,
    NoFlyZone,
    PerceptionReading,
    MissionAssignment,
    SafetyAbort,
    MissionReport,
    nextMissionId,
} from '../neurotwin.data.js';

const BATTERY_ABORT_THRESHOLD = 15;

export class MissionControlAgent {
    // 1. Mission planning
    private planWaypoints(goal: string, unitIds: string[]): MissionAssignment[] {
        const taskTypes: Waypoint['taskType'][] = ['scan', 'inspect', 'deliver', 'return'];
        return unitIds.map((unitId, unitIndex) => {
            const waypoints: Waypoint[] = taskTypes.map((taskType, i) => ({
                id: `${unitId}-wp-${i + 1}`,
                coords: [
                    Math.round(((unitIndex + 1) * 17 + i * 23) % 100),
                    Math.round(((unitIndex + 1) * 31 + i * 11) % 100),
                ] as [number, number],
                altitudeM: 30 + i * 10,
                taskType,
            }));
            return { unitId, waypoints };
        });
    }

    // 2. Perception
    private perceive(unitIds: string[]): PerceptionReading[] {
        return unitIds.map((unitId) => ({
            unitId,
            obstacleDetected: Math.random() < 0.15,
            visibilityPct: Math.round(60 + Math.random() * 40),
            batteryPct: Math.round(20 + Math.random() * 80),
            timestamp: new Date().toISOString(),
        }));
    }

    // 3. Coordination (overlap/collision check)
    private coordinate(assignments: MissionAssignment[]): number {
        let collisionsAvoided = 0;
        for (let i = 0; i < assignments.length; i++) {
            for (let j = i + 1; j < assignments.length; j++) {
                for (const wpA of assignments[i].waypoints) {
                    for (const wpB of assignments[j].waypoints) {
                        const dx = wpA.coords[0] - wpB.coords[0];
                        const dy = wpA.coords[1] - wpB.coords[1];
                        if (Math.sqrt(dx * dx + dy * dy) < 5) {
                            wpB.coords = [wpB.coords[0] + 6, wpB.coords[1] + 6];
                            collisionsAvoided += 1;
                        }
                    }
                }
            }
        }
        return collisionsAvoided;
    }

    // 4. Safety compliance
    private checkSafety(assignments: MissionAssignment[], perception: PerceptionReading[]): SafetyAbort[] {
        const aborts: SafetyAbort[] = [];

        for (const reading of perception) {
            if (reading.batteryPct < BATTERY_ABORT_THRESHOLD) {
                aborts.push({ unitId: reading.unitId, reason: `Battery below ${BATTERY_ABORT_THRESHOLD}% (${reading.batteryPct}%)` });
            }
            if (reading.obstacleDetected) {
                aborts.push({ unitId: reading.unitId, reason: 'Obstacle detected in path' });
            }
        }

        for (const assignment of assignments) {
            for (const wp of assignment.waypoints) {
                for (const zone of NO_FLY_ZONES as NoFlyZone[]) {
                    const dx = wp.coords[0] - zone.center[0];
                    const dy = wp.coords[1] - zone.center[1];
                    if (Math.sqrt(dx * dx + dy * dy) < zone.radiusPct) {
                        aborts.push({ unitId: assignment.unitId, reason: `Waypoint ${wp.id} inside no-fly zone "${zone.name}"` });
                    }
                }
            }
        }

        return aborts;
    }

    // Runs all 4 in sequence
    runMission(goal: string, unitIds?: string[]): MissionReport {
        const ids = unitIds && unitIds.length > 0 ? unitIds : FLEET_UNITS.map((u) => u.id);

        const assignments = this.planWaypoints(goal, ids);
        const perception = this.perceive(ids);
        const collisionsAvoided = this.coordinate(assignments);
        const safetyAborts = this.checkSafety(assignments, perception);

        return {
            missionId: nextMissionId(),
            goal,
            assignments,
            collisionsAvoided,
            safetyAborts,
            perception,
            status: safetyAborts.length > 0 ? 'aborted' : 'completed',
            completedAt: new Date().toISOString(),
        };
    }
}
