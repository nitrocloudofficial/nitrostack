import { Module } from '@nitrostack/core';
import { CoordinatorTools } from './coordinator.tools.js';

@Module({
  name: 'coordinator',
  description: 'Enterprise Coordinator MCP Module for master incident orchestration across Security, Compliance, Mail, and Arbitration MCPs.',
  controllers: [CoordinatorTools]
})
export class CoordinatorModule {}
