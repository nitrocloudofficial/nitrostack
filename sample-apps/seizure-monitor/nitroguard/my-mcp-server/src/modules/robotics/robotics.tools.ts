import { ToolDecorator as Tool, Widget, UseGuards, RateLimit, z, ExecutionContext } from '@nitrostack/core';
import { TrajectoryPlanner, Point3D } from './trajectory-planner.service.js';
import { SafetyFilter, SafetyMode, RiskLevel } from './safety-filter.service.js';
import { ExecutionAdapter } from './execution-adapter.service.js';
import { ApiKeyGuard } from '../../guards/api-key.guard.js';

export interface PathStep {
  nominal: Point3D;
  corrected: Point3D;
  correctedFlag: boolean;
  risk: RiskLevel;
  correctionDistance: number;
}

export class RoboticsTools {
  constructor(
    private readonly trajectoryPlanner: TrajectoryPlanner,
    private readonly safetyFilter: SafetyFilter,
    private readonly executionAdapter: ExecutionAdapter
  ) {}

  @Tool({
    name: 'execute_safe_movement',
    title: 'Execute Safe Robot Movement Vector',
    description: 'Plans a multi-waypoint path and executes a safe robot trajectory with step-by-step Control Barrier Function (CBF) interception.',
    inputSchema: z.object({
      targetX: z.number().describe('Target X coordinate requested by AI model (0 to 15)'),
      targetY: z.number().describe('Target Y coordinate requested by AI model (0 to 15)'),
      targetZ: z.number().optional().describe('Target Z coordinate requested by AI model (0 to 15) for 3D trajectory'),
      safetyMode: z.enum(['FASTEST', 'SAFEST']).optional().default('FASTEST').describe('Safety mode configuration defining safety margins and velocity profiles')
    }),
    outputSchema: z.any(),
    invocation: {
      invoking: 'Running NitroGuard CBF Safety Interceptor...',
      invoked: 'Safety trajectory verified and dispatched.'
    }
  })
  @UseGuards(ApiKeyGuard)
  @RateLimit({ requests: 15, window: '1m' })
  @Widget('trajectory-viewer')
  async executeSafeMovement(
    input: { targetX: number; targetY: number; targetZ?: number; safetyMode?: SafetyMode },
    ctx: ExecutionContext
  ) {
    const safetyMode = input.safetyMode || 'FASTEST';
    ctx.logger.info('NitroGuard processing raw AI waypoint request', { input, safetyMode });

    // Check E-Stop
    const robotState = await this.executionAdapter.getRobotState();
    if (robotState.emergencyStop) {
      ctx.logger.error('Safety Fault: Robot is locked under EMERGENCY STOP.');
      throw new Error('Action blocked: Robot is currently locked under Emergency Stop mode. Reset E-stop first.');
    }

    const start: Point3D = {
      x: robotState.x,
      y: robotState.y,
      z: robotState.z
    };

    const target: Point3D = {
      x: input.targetX,
      y: input.targetY,
      z: input.targetZ ?? 0.0
    };

    // 1. Plan Nominal Path
    const nominalWaypoints = this.trajectoryPlanner.generateNominalPath(start, target, 8);
    const steps: PathStep[] = [];
    const is3D = input.targetZ !== undefined || robotState.z > 0;

    let wasCorrected = false;
    let totalCorrectionDistance = 0;
    let activeObstacle: any = undefined;
    let highestRisk: RiskLevel = 'NONE';

    // Risk hierarchy for checking max risk
    const riskPriority: Record<RiskLevel, number> = {
      NONE: 0,
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4
    };

    // 2. Filter safety for every waypoint
    for (const waypoint of nominalWaypoints) {
      let filterResult;
      if (is3D) {
        filterResult = await this.executionAdapter.solveCBF3D(waypoint, safetyMode);
      } else {
        filterResult = this.safetyFilter.solveCBF2D(waypoint, safetyMode);
      }

      if (filterResult.correctedFlag) {
        wasCorrected = true;
        totalCorrectionDistance += filterResult.correctionDistance;
        if (!activeObstacle) {
          activeObstacle = filterResult.activeObstacle;
        }
      }

      if (riskPriority[filterResult.risk] > riskPriority[highestRisk]) {
        highestRisk = filterResult.risk;
      }

      steps.push({
        nominal: filterResult.nominal,
        corrected: filterResult.corrected,
        correctedFlag: filterResult.correctedFlag,
        risk: filterResult.risk,
        correctionDistance: filterResult.correctionDistance
      });
    }

    // 3. Execution update
    const finalStep = steps[steps.length - 1];
    const finalPosition = finalStep.corrected;

    // Calculate velocity based on safety mode limits
    const config = this.safetyFilter.getSafetyConfig(safetyMode);
    const dx = finalPosition.x - start.x;
    const dy = finalPosition.y - start.y;
    const dz = finalPosition.z - start.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    let velocity = { x: 0, y: 0, z: 0 };
    if (distance > 1e-4) {
      velocity = {
        x: Number(((dx / distance) * config.maxSpeed).toFixed(2)),
        y: Number(((dy / distance) * config.maxSpeed).toFixed(2)),
        z: Number(((dz / distance) * config.maxSpeed).toFixed(2))
      };
    }

    // Update simulation state & dispatch velocity to MuJoCo
    await this.executionAdapter.applyCommand(config.maxSpeed);
    this.executionAdapter.setRobotState({
      x: finalPosition.x,
      y: finalPosition.y,
      z: finalPosition.z,
      mode: 'AUTO'
    });

    // Log this mission
    this.executionAdapter.logMission({
      safetyMode,
      startPosition: start,
      endPosition: finalPosition,
      wasCorrected,
      maxRiskLevel: highestRisk,
      totalCorrectionDistance: Number(totalCorrectionDistance.toFixed(2)),
      stepsCount: steps.length
    });

    const obstacles = is3D ? this.safetyFilter.getObstacles3D() : this.safetyFilter.getObstacles();

    return {
      steps,
      wasCorrected,
      maxRiskLevel: highestRisk,
      totalCorrectionDistance: Number(totalCorrectionDistance.toFixed(2)),
      activeObstacle,
      obstacles,
      safetyMode,
      timestamp: new Date().toISOString()
    };
  }

  @Tool({
    name: 'execute_safe_motion',
    title: 'Execute Safe Robot Motion Vector (Alias)',
    description: 'Plans a multi-waypoint path and executes a safe robot trajectory with CBF interception.',
    inputSchema: z.object({
      targetX: z.number().describe('Target X coordinate (0 to 15)'),
      targetY: z.number().describe('Target Y coordinate (0 to 15)'),
      targetZ: z.number().optional().describe('Target Z coordinate (0 to 15)'),
      safetyMode: z.enum(['FASTEST', 'SAFEST']).optional().default('FASTEST').describe('Safety mode configuration')
    })
  })
  @UseGuards(ApiKeyGuard)
  @Widget('trajectory-viewer')
  async executeSafeMotion(
    input: { targetX: number; targetY: number; targetZ?: number; safetyMode?: SafetyMode },
    ctx: ExecutionContext
  ) {
    return this.executeSafeMovement(input, ctx);
  }

  @Tool({
    name: 'get_robot_state',
    title: 'Get Live Robot Telemetry State',
    description: 'Polls the current live position coordinates, battery status, and operation mode of the robot.',
    inputSchema: z.object({}),
    outputSchema: z.any()
  })
  async getRobotState(input: {}, ctx: ExecutionContext) {
    ctx.logger.info('Polling robot telemetry state');
    return this.executionAdapter.getRobotState();
  }

  @Tool({
    name: 'emergency_stop',
    title: 'Trigger or Reset Emergency Stop',
    description: 'Locks the robot movement state immediately (E-Stop) or clears the lock to resume AUTO mode.',
    inputSchema: z.object({
      active: z.boolean().describe('Set to true to activate E-Stop, or false to clear and reset the E-Stop')
    }),
    outputSchema: z.any()
  })
  @UseGuards(ApiKeyGuard)
  async emergencyStop(
    input: { active: boolean },
    ctx: ExecutionContext
  ) {
    ctx.logger.warn('Emergency Stop command issued', { active: input.active });
    this.executionAdapter.setEmergencyStop(input.active);
    return {
      status: input.active ? 'ESTOP_LOCKED' : 'SYSTEM_READY',
      robotState: this.executionAdapter.getRobotState(),
      timestamp: new Date().toISOString()
    };
  }
}
