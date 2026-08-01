import { ResourceDecorator as Resource, Cache, ExecutionContext } from '@nitrostack/core';
import { SafetyFilter } from './safety-filter.service.js';
import { ExecutionAdapter } from './execution-adapter.service.js';

export class RoboticsResources {
  constructor(
    private readonly safetyFilter: SafetyFilter,
    private readonly executionAdapter: ExecutionAdapter
  ) {}

  @Resource({
    uri: 'sim://obstacle-map',
    name: 'Industrial Robot Safety Obstacle Map',
    description: 'Real-time 2D hazard zone map containing circular physical barriers and keeping-out bounds.',
    mimeType: 'application/json'
  })
  @Cache({ ttl: 10 })
  async getObstacleMap(ctx: ExecutionContext) {
    ctx.logger.info('Fetching obstacle map resource');
    const obstacles = this.safetyFilter.getObstacles();

    return {
      contents: [
        {
          uri: 'sim://obstacle-map',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              environment: 'Edge Manufacturing Facility Zone B',
              coordinateBounds: { minX: 0, maxX: 15, minY: 0, maxY: 15 },
              obstacles,
              lastUpdated: new Date().toISOString()
            },
            null,
            2
          )
        }
      ]
    };
  }

  @Resource({
    uri: 'sim://factory-layout',
    name: 'Industrial Factory Floor Layout',
    description: '15x15 industrial grid bounds and standard machine locations.',
    mimeType: 'application/json'
  })
  @Cache({ ttl: 60 })
  async getFactoryLayout(ctx: ExecutionContext) {
    ctx.logger.info('Fetching factory layout resource');
    return {
      contents: [
        {
          uri: 'sim://factory-layout',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              gridDimensions: { minX: 0, maxX: 15, minY: 0, maxY: 15 },
              units: 'meters',
              zones: [
                { id: 'zone-A', name: 'Assembly Line A', x: 2, y: 8, width: 4, height: 3 },
                { id: 'zone-B', name: 'Robotic Welding Cell', x: 8, y: 8, width: 4, height: 4 }
              ]
            },
            null,
            2
          )
        }
      ]
    };
  }

  @Resource({
    uri: 'sim://robot-state',
    name: 'Live Robot Telemetry State',
    description: 'Real-time robot pose, velocity vectors, and active control mode (no battery tracking).',
    mimeType: 'application/json'
  })
  async getRobotState(ctx: ExecutionContext) {
    ctx.logger.info('Fetching robot state resource');
    const state = this.executionAdapter.getRobotState();
    return {
      contents: [
        {
          uri: 'sim://robot-state',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              robotId: 'AMR-09-V3',
              telemetry: state,
              lastUpdated: new Date().toISOString()
            },
            null,
            2
          )
        }
      ]
    };
  }

  @Resource({
    uri: 'sim://hazard-map',
    name: 'Active Machine Hazard Map',
    description: 'Coordinates, safety boundaries, and classification of physical machine danger zones.',
    mimeType: 'application/json'
  })
  @Cache({ ttl: 10 })
  async getHazardMap(ctx: ExecutionContext) {
    ctx.logger.info('Fetching hazard map resource');
    const obstacles2D = this.safetyFilter.getObstacles();
    const obstacles3D = this.safetyFilter.getObstacles3D();
    return {
      contents: [
        {
          uri: 'sim://hazard-map',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              description: 'Active hazard coordinates for upstream Control Barrier Functions (CBF)',
              dimensions: '2D & 3D',
              hazards: {
                '2D': obstacles2D,
                '3D': obstacles3D
              },
              lastUpdated: new Date().toISOString()
            },
            null,
            2
          )
        }
      ]
    };
  }

  @Resource({
    uri: 'sim://safety-policy',
    name: 'Deterministic Safety Policy Spec',
    description: 'Outlines the Control Barrier Function boundaries, clearance margins, and emergency overrides.',
    mimeType: 'application/json'
  })
  @Cache({ ttl: 60 })
  async getSafetyPolicy(ctx: ExecutionContext) {
    ctx.logger.info('Fetching safety policy resource');
    return {
      contents: [
        {
          uri: 'sim://safety-policy',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              safetyMargins: {
                FASTEST: 0.5,
                SAFEST: 1.0
              },
              emergencyStopPolicy: 'Instant velocity reduction to 0. Lock AMR path-planning tools.',
              cbfFormula: 'h(x) = ||x - p_obs||^2 - (r + margin)^2 >= 0',
              isolationState: 'Deterministic local mathematical deflection'
            },
            null,
            2
          )
        }
      ]
    };
  }

  @Resource({
    uri: 'sim://mission-log',
    name: 'Robotic Gateway Decision Mission Log',
    description: 'Historical records of path requests, safety violations, and CBF vector deflections.',
    mimeType: 'application/json'
  })
  async getMissionLog(ctx: ExecutionContext) {
    ctx.logger.info('Fetching mission log resource');
    const logs = this.executionAdapter.getMissionLogs();
    return {
      contents: [
        {
          uri: 'sim://mission-log',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              description: 'Upstream Intent Interception Logs (Last 50 missions)',
              logs,
              totalRecords: logs.length
            },
            null,
            2
          )
        }
      ]
    };
  }
}
