import { Module } from '@nitrostack/core';
import { GatewayTools } from './gateway.tools.js';
import { GatewayResources } from './gateway.resources.js';
import { GatewayPrompts } from './gateway.prompts.js';

@Module({
  name: 'gateway',
  description:
    'Agentic Commerce Gateway — screens AI buying agents before a sale settles and verifies receipts against the on-chain record',
  controllers: [GatewayTools, GatewayResources, GatewayPrompts],
})
export class GatewayModule {}
