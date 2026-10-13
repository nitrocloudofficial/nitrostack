/**
 * HealthBridgeModule
 * ==================
 * Feature module that registers the service, controllers (tools + resources)
 * with NitroStack's DI container and MCP registry.
 *
 * Controllers = classes decorated with @Controller that contain @Tool / @Resource methods.
 * Providers   = injectable services made available to controller constructors.
 */

import { Module } from '@nitrostack/core';
import { HealthBridgeService } from './healthbridge.service';
import { HealthBridgeTools } from './healthbridge.tools';
import { HealthBridgeResources } from './healthbridge.resources';

@Module({
  name: 'healthbridge',
  description: 'Cross-hospital patient safety MCP tools and resources',
  providers: [HealthBridgeService],
  controllers: [HealthBridgeTools, HealthBridgeResources],
})
export class HealthBridgeModule {}
