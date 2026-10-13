import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { HealthModule } from './health/health.module.js';

@McpApp({
  module: AppModule,
  server: { name: 'healthsync-mcp', version: '1.0.0' },
  logging: { level: 'info' },
})
@Module({
  name: 'app',
  imports: [
    ConfigModule.forRoot(),
    HealthModule
  ],
})
export class AppModule {}