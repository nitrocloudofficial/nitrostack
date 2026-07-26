import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { AegisModule } from './modules/aegis/aegis.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module — Aegis Protocol
 * 
 * Zero-Knowledge Threat Fusion Engine for Digital Arrest Scam Detection.
 * Implements a 2-Agent "Maker-Checker" architecture with HITL (Human-in-the-Loop)
 * guard enforcement via the fraud officer dashboard widget.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'aegis-protocol-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Aegis Protocol — Root application module',
  imports: [
    ConfigModule.forRoot(),
    AegisModule,
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
