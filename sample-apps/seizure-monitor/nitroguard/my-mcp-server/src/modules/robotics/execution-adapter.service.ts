import { Injectable } from '@nitrostack/core';
import { Point3D } from './trajectory-planner.service.js';
import { SafetyFilter, SafetyMode, WaypointCorrectionResult, RiskLevel } from './safety-filter.service.js';

/**
 * RobotState — camelCase contract shared with Python sim_bridge.py.
 * DO NOT rename fields: Python enforces camelCase on its side to match this exactly.
 */
export interface RobotState {
  robotId: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  linearVelocity: number;
  angularVelocity: number;
  battery: number;
  mode: 'AUTO' | 'ESTOP' | 'MANUAL';
  status: 'IDLE' | 'MOVING' | 'ESTOP';
  emergencyStop?: boolean;
}

export interface TrajectoryLog {
  timestamp: string;
  safetyMode: SafetyMode;
  startPosition: Point3D;
  endPosition: Point3D;
  wasCorrected: boolean;
  maxRiskLevel: RiskLevel;
  totalCorrectionDistance: number;
  stepsCount: number;
}

/**
 * SIM_BACKEND env var makes the swap between backends a config-only change:
 *   SIM_BACKEND=http://localhost:8000  → MuJoCo physics bridge (mujoco-sim/sim_bridge.py)
 *   (unset)                            → local mathematical fallback (SafetyFilter)
 *
 * Everything upstream (tools, SafetyService, Planner, widget) is identical.
 */
const SIM_BACKEND = process.env.SIM_BACKEND ?? 'http://localhost:8000';

@Injectable()
export class ExecutionAdapter {
  private localRobotState: RobotState = {
    robotId: 'AMR-01',
    x: 2.0,
    y: 2.0,
    z: 0.0,
    heading: 0.0,
    linearVelocity: 0.0,
    angularVelocity: 0.0,
    battery: 82,
    mode: 'AUTO',
    status: 'IDLE',
    emergencyStop: false
  };

  private missionLogs: TrajectoryLog[] = [];

  constructor(private readonly safetyFilter: SafetyFilter) {}

  /**
   * Fetch live robot state from the MuJoCo bridge, fall back to local state.
   * TypeScript widget polls this via the robotics resource layer.
   */
  public async getRobotState(): Promise<RobotState> {
    try {
      const res = await fetch(`${SIM_BACKEND}/robot_state`);
      if (!res.ok) throw new Error('Bridge /robot_state failed');
      const remote = await res.json() as RobotState;
      // Keep local ESTOP flag authoritative (set by emergency_stop tool)
      remote.emergencyStop = this.localRobotState.emergencyStop;
      remote.mode = this.localRobotState.emergencyStop ? 'ESTOP' : remote.mode;
      this.localRobotState = remote;
      return remote;
    } catch {
      return this.localRobotState;
    }
  }

  public setRobotState(state: Partial<RobotState>) {
    this.localRobotState = {
      ...this.localRobotState,
      ...state
    };
  }

  public setEmergencyStop(active: boolean) {
    this.localRobotState.emergencyStop = active;
    this.localRobotState.mode = active ? 'ESTOP' : 'AUTO';
    this.localRobotState.status = active ? 'ESTOP' : 'IDLE';
    this.localRobotState.linearVelocity = 0;
    this.localRobotState.angularVelocity = 0;
  }

  public getMissionLogs(): TrajectoryLog[] {
    return this.missionLogs;
  }

  public logMission(log: Omit<TrajectoryLog, 'timestamp'>) {
    this.missionLogs.unshift({
      timestamp: new Date().toISOString(),
      ...log
    });
    if (this.missionLogs.length > 50) {
      this.missionLogs.pop();
    }
  }

  /**
   * applyCommand — THE integration point. Only this URL differs between backends.
   * Sends (linearVelocity, angularVelocity) from SafetyService CBF output
   * to the Python bridge which translates to MuJoCo actuator forces and steps physics.
   */
  public async applyCommand(
    linearVelocity: number,
    angularVelocity: number = 0.0,
    nstep: number = 10
  ): Promise<RobotState> {
    try {
      const res = await fetch(`${SIM_BACKEND}/apply_command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linearVelocity, angularVelocity, nstep })
      });

      if (!res.ok) throw new Error(`Bridge /apply_command returned ${res.status}`);

      const state = await res.json() as RobotState;
      state.emergencyStop = this.localRobotState.emergencyStop;
      this.localRobotState = state;
      return state;
    } catch {
      // Local fallback: update position estimate from velocity x time
      const dt = (nstep * 0.005);  // nstep * timestep (0.005s)
      this.localRobotState.x += linearVelocity * Math.cos(this.localRobotState.heading) * dt;
      this.localRobotState.y += linearVelocity * Math.sin(this.localRobotState.heading) * dt;
      this.localRobotState.linearVelocity = linearVelocity;
      this.localRobotState.status = 'MOVING';
      return this.localRobotState;
    }
  }

  /**
   * solveCBF3D — resolves safety correction from the bridge or local math fallback.
   * Bridge endpoint: /solve-3d-cbf (legacy) — kept for compatibility.
   */
  public async solveCBF3D(nominal: Point3D, mode: SafetyMode): Promise<WaypointCorrectionResult> {
    try {
      const response = await fetch(`${SIM_BACKEND}/solve-3d-cbf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetX: nominal.x, targetY: nominal.y, targetZ: nominal.z })
      });

      if (!response.ok) throw new Error('Bridge /solve-3d-cbf returned error');

      const bridgeResult = (await response.json()) as any;
      const { margin } = this.safetyFilter.getSafetyConfig(mode);
      const safeTarget = bridgeResult.safeTarget as Point3D;

      let closestObsEdgeDistance = Infinity;
      const obstacles3D = this.safetyFilter.getObstacles3D();
      for (const obs of obstacles3D) {
        const dx = safeTarget.x - obs.x;
        const dy = safeTarget.y - obs.y;
        const dz = safeTarget.z - obs.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) - obs.radius;
        if (dist < closestObsEdgeDistance) closestObsEdgeDistance = dist;
      }

      return {
        nominal,
        corrected: safeTarget,
        correctedFlag: bridgeResult.wasCorrected,
        activeObstacle: bridgeResult.activeObstacle,
        risk: this.safetyFilter.evaluateRisk(closestObsEdgeDistance),
        distanceToObstacle: Number(closestObsEdgeDistance.toFixed(2)),
        safetyMargin: margin,
        correctionDistance: bridgeResult.correctionDistance
      };

    } catch {
      return this.safetyFilter.solveCBF3DLocal(nominal, mode);
    }
  }
}
