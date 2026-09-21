import { Module } from '@nitrostack/core';
import { BridgeTools } from './bridge.tools.js';
import { BridgeResources } from './bridge.resources.js';

@Module({
  name: 'bridge',
  description: 'MCP to FastAPI Backend Bridge - connects to the AEIOS-X Python backend',
  controllers: [BridgeTools, BridgeResources],
})
export class BridgeModule {}
