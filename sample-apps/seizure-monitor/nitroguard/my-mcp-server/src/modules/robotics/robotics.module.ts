import { Module } from '@nitrostack/core';
import { TrajectoryPlanner } from './trajectory-planner.service.js';
import { SafetyFilter } from './safety-filter.service.js';
import { ExecutionAdapter } from './execution-adapter.service.js';
import { RoboticsTools } from './robotics.tools.js';
import { RoboticsResources } from './robotics.resources.js';
import { RoboticsPrompts } from './robotics.prompts.js';
import { ApiKeyGuard } from '../../guards/api-key.guard.js';

@Module({
  name: 'robotics',
  description: 'NitroGuard Dynamic CBF Safety Interceptor & 3D Robot Motion Control Module',
  controllers: [RoboticsTools, RoboticsResources, RoboticsPrompts],
  providers: [TrajectoryPlanner, SafetyFilter, ExecutionAdapter, ApiKeyGuard],
  exports: [TrajectoryPlanner, SafetyFilter, ExecutionAdapter]
})
export class RoboticsModule {}
