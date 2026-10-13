import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { RecruiterModule } from './modules/recruiter/recruiter.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * Bootstraps the Candidate Data Transformer MCP Server.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'candidate-transformer',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Candidate Data Transformer MCP Server',
  imports: [
    ConfigModule.forRoot(),
    RecruiterModule
  ],
  providers: [
    SystemHealthCheck,
  ]
})
export class AppModule {}
