import { Injectable } from '@nitrostack/core';
import { Point3D } from './trajectory-planner.service.js';

export interface Point2D {
  x: number;
  y: number;
}

export interface Obstacle2D {
  id: string;
  x: number;
  y: number;
  radius: number;
  label?: string;
}

export interface Obstacle3D {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  label?: string;
}

export type SafetyMode = 'FASTEST' | 'SAFEST';
export type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface WaypointCorrectionResult {
  nominal: Point3D;
  corrected: Point3D;
  correctedFlag: boolean;
  activeObstacle?: Obstacle2D | Obstacle3D;
  risk: RiskLevel;
  distanceToObstacle: number;
  safetyMargin: number;
  correctionDistance: number;
}

@Injectable()
export class SafetyFilter {
  private readonly defaultObstacles: Obstacle2D[] = [
    { id: 'obs-1', x: 5.0, y: 5.0, radius: 2.0, label: 'Industrial Press (Hazard Zone)' },
    { id: 'obs-2', x: 10.0, y: 3.0, radius: 1.5, label: 'High Voltage Cabinet' },
    { id: 'obs-3', x: 7.0, y: 11.0, radius: 2.2, label: 'Automated Conveyor' }
  ];

  private readonly obstacles3D: Obstacle3D[] = [
    { id: 'press_3d', x: 5.0, y: 5.0, z: 2.0, radius: 2.0, label: '3D Industrial Robotic Press' },
    { id: 'cabinet_3d', x: 10.0, y: 3.0, z: 1.5, radius: 1.5, label: 'High Voltage Terminal' },
    { id: 'conveyor_3d', x: 7.0, y: 11.0, z: 2.5, radius: 2.2, label: 'Automated Gantry' }
  ];

  public getObstacles(): Obstacle2D[] {
    return this.defaultObstacles;
  }

  public getObstacles3D(): Obstacle3D[] {
    return this.obstacles3D;
  }

  public getSafetyConfig(mode: SafetyMode) {
    if (mode === 'SAFEST') {
      return { margin: 1.0, maxSpeed: 0.6 };
    }
    return { margin: 0.5, maxSpeed: 1.2 };
  }

  /**
   * Determine the risk level based on the distance to the closest obstacle edge.
   * If distance is negative or very close, risk is CRITICAL.
   */
  public evaluateRisk(distance: number): RiskLevel {
    if (distance > 2.0) return 'NONE';
    if (distance >= 1.5) return 'LOW';
    if (distance >= 1.0) return 'MEDIUM';
    if (distance >= 0.5) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * 2D Control Barrier Function filter for a single waypoint
   */
  public solveCBF2D(nominal: Point2D, mode: SafetyMode = 'FASTEST'): WaypointCorrectionResult {
    const { margin } = this.getSafetyConfig(mode);
    let safeX = nominal.x;
    let safeY = nominal.y;
    let corrected = false;
    let hitObstacle: Obstacle2D | undefined = undefined;

    for (const obs of this.defaultObstacles) {
      const minAllowedDist = obs.radius + margin;
      const dx = nominal.x - obs.x;
      const dy = nominal.y - obs.y;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);

      // Check violation
      if (distToCenter < minAllowedDist) {
        corrected = true;
        hitObstacle = obs;

        const unitX = distToCenter === 0 ? 1 : dx / distToCenter;
        const unitY = distToCenter === 0 ? 0 : dy / distToCenter;

        // Project coordinate outwards to the safe margin boundary
        safeX = Number((obs.x + unitX * minAllowedDist).toFixed(2));
        safeY = Number((obs.y + unitY * minAllowedDist).toFixed(2));
      }
    }

    const correctionDist = Number(
      Math.sqrt(
        Math.pow(safeX - nominal.x, 2) + Math.pow(safeY - nominal.y, 2)
      ).toFixed(2)
    );

    // Calculate actual physical distance from the (possibly corrected) point to the closest obstacle edge
    let closestObsEdgeDistance = Infinity;
    for (const obs of this.defaultObstacles) {
      const dx = safeX - obs.x;
      const dy = safeY - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy) - obs.radius;
      if (dist < closestObsEdgeDistance) {
        closestObsEdgeDistance = dist;
      }
    }

    return {
      nominal: { x: nominal.x, y: nominal.y, z: 0 },
      corrected: { x: safeX, y: safeY, z: 0 },
      correctedFlag: corrected,
      activeObstacle: hitObstacle,
      risk: this.evaluateRisk(closestObsEdgeDistance),
      distanceToObstacle: Number(closestObsEdgeDistance.toFixed(2)),
      safetyMargin: margin,
      correctionDistance: correctionDist
    };
  }

  /**
   * 3D Control Barrier Function filter for a single waypoint (local math)
   */
  public solveCBF3DLocal(nominal: Point3D, mode: SafetyMode = 'FASTEST'): WaypointCorrectionResult {
    const { margin } = this.getSafetyConfig(mode);
    let safeX = nominal.x;
    let safeY = nominal.y;
    let safeZ = nominal.z;
    let corrected = false;
    let hitObstacle: Obstacle3D | undefined = undefined;

    for (const obs of this.obstacles3D) {
      const minAllowedDist = obs.radius + margin;
      const dx = nominal.x - obs.x;
      const dy = nominal.y - obs.y;
      const dz = nominal.z - obs.z;
      const distToCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distToCenter < minAllowedDist) {
        corrected = true;
        hitObstacle = obs;

        const unitX = distToCenter === 0 ? 1 : dx / distToCenter;
        const unitY = distToCenter === 0 ? 0 : dy / distToCenter;
        const unitZ = distToCenter === 0 ? 0 : dz / distToCenter;

        safeX = Number((obs.x + unitX * minAllowedDist).toFixed(2));
        safeY = Number((obs.y + unitY * minAllowedDist).toFixed(2));
        safeZ = Number((obs.z + unitZ * minAllowedDist).toFixed(2));
      }
    }

    const correctionDist = Number(
      Math.sqrt(
        Math.pow(safeX - nominal.x, 2) + Math.pow(safeY - nominal.y, 2) + Math.pow(safeZ - nominal.z, 2)
      ).toFixed(2)
    );

    let closestObsEdgeDistance = Infinity;
    for (const obs of this.obstacles3D) {
      const dx = safeX - obs.x;
      const dy = safeY - obs.y;
      const dz = safeZ - obs.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) - obs.radius;
      if (dist < closestObsEdgeDistance) {
        closestObsEdgeDistance = dist;
      }
    }

    return {
      nominal: { ...nominal },
      corrected: { x: safeX, y: safeY, z: safeZ },
      correctedFlag: corrected,
      activeObstacle: hitObstacle,
      risk: this.evaluateRisk(closestObsEdgeDistance),
      distanceToObstacle: Number(closestObsEdgeDistance.toFixed(2)),
      safetyMargin: margin,
      correctionDistance: correctionDist
    };
  }
}
