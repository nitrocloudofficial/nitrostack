/**
 * AppModule — Root NitroStack @McpApp application
 * Registers HealthBridgeModule and configures transport for NitroCloud.
 */

import 'reflect-metadata';
import { McpApp } from '@nitrostack/core';
import { HealthBridgeModule } from './modules/healthbridge/healthbridge.module';

@McpApp({
  module: HealthBridgeModule,
  server: {
    name: 'healthbridge-mcp',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
  transport: {
    type: (process.env.MCP_TRANSPORT_TYPE as 'stdio' | 'http' | 'dual') ?? 'http',
    http: {
      port: Number(process.env.PORT ?? 3000),
      host: '0.0.0.0',
    },
  },
})
export class AppModule {}
