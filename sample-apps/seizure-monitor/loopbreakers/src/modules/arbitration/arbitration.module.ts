import { Module } from '@nitrostack/core';
import { ArbitrationTools } from './arbitration.tools.js';

@Module({
  name: 'arbitration',
  description: 'Enterprise Arbitration MCP Module for proposal aggregation, conflict resolution, action prioritization, and final decision engine.',
  controllers: [ArbitrationTools]
})
export class ArbitrationModule {}
