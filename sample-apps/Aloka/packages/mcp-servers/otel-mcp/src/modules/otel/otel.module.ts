import { Module } from '@nitrostack/core';
import { OTelTools } from './otel.tools.js';
import { OTelResources } from './otel.resources.js';
import { OTelService } from './otel.service.js';

@Module({
  name: 'otel',
  description: 'OpenTelemetry (Tempo) MCP server',
  controllers: [OTelTools, OTelResources],
  providers: [OTelService]
})
export class OTelModule {}
