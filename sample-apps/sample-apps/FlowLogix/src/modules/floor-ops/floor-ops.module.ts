import { Module } from '@nitrostack/core';
import { DockService } from './services/dock.service.js';
import { FloorOpsInboundTools } from './floor-ops-inbound.tools.js';
import { FloorOpsOutboundTools } from './floor-ops-outbound.tools.js';

/**
 * Floor Operations Module
 *
 * Owns the Floor Operations Agent's Stage 1 tools:
 *   - UC2: Inbound Traffic Delay & Dock Re-scheduling
 *   - UC3: Blind Receiving (Unannounced Truck Arrival)
 *
 * Exported services can be consumed by other modules if needed.
 */
@Module({
  name: 'floor-ops',
  description: 'Floor Operations Agent — manages dock doors, worker assignments, and physical receiving logistics',
  providers: [DockService],
  controllers: [FloorOpsInboundTools, FloorOpsOutboundTools],
  exports: [DockService],
})
export class FloorOpsModule {}
