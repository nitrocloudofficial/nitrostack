import { Module } from '@nitrostack/core';
import { MedBridgeTools } from './medbridge.tools.js';
import { MedBridgeResources } from './medbridge.resources.js';
import { MedBridgeService } from './medbridge.service.js';

@Module({
  name: 'medbridge',
  description: 'Consent-gated health record reconciliation for MedBridge',
  controllers: [MedBridgeTools, MedBridgeResources],
  providers: [MedBridgeService],
  exports: [MedBridgeService],
})
export class MedBridgeModule {}
