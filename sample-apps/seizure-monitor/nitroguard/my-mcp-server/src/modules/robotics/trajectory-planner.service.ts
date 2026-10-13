import { Injectable } from '@nitrostack/core';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

@Injectable()
export class TrajectoryPlanner {
  /**
   * Generates a linear nominal path from start to target.
   */
  public generateNominalPath(start: Point3D, target: Point3D, numWaypoints: number = 8): Point3D[] {
    const path: Point3D[] = [];
    
    // Always insert start point
    path.push({
      x: Number(start.x.toFixed(2)),
      y: Number(start.y.toFixed(2)),
      z: Number(start.z.toFixed(2))
    });

    // Generate intermediate waypoints
    for (let i = 1; i < numWaypoints; i++) {
      const t = i / numWaypoints;
      path.push({
        x: Number((start.x + t * (target.x - start.x)).toFixed(2)),
        y: Number((start.y + t * (target.y - start.y)).toFixed(2)),
        z: Number((start.z + t * (target.z - start.z)).toFixed(2))
      });
    }

    // Insert target point
    path.push({
      x: Number(target.x.toFixed(2)),
      y: Number(target.y.toFixed(2)),
      z: Number(target.z.toFixed(2))
    });

    return path;
  }
}
