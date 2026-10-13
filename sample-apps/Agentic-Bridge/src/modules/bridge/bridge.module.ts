import { Module } from '@nitrostack/core';
import { BridgeResources } from './bridge.resources.js';
import { BridgePrompts } from './bridge.prompts.js';
import { BridgeTools } from './bridge.tools.js';
import { SynthesisModule } from '../synthesis/synthesis.module.js';

@Module({
  name: 'bridge',
  description: 'Bridge state exposed as MCP resources, plus guided prompts and runtime config',
  imports: [SynthesisModule],
  controllers: [BridgeResources, BridgePrompts, BridgeTools],
})
export class BridgeModule {}
