import { McpApp, Module } from '@nitrostack/core';
import { OTelModule } from './modules/otel/otel.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'otel-mcp',
    version: '1.0.0'
  },
  logging: {
    level: 'error'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    OTelModule
  ]
})
export class AppModule {}
