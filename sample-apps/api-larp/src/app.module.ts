import { McpApp, Module } from '@nitrostack/core';
import { ApiGuardModule } from './modules/apiguard/apiguard.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'api-larp',
    version: '1.0.0'
  },
  logging: {
    level: (process.env.LOG_LEVEL ?? 'info') as 'debug' | 'info' | 'warn' | 'error'
  }
})
@Module({
  name: 'app',
  imports: [ApiGuardModule]
})
export class AppModule {}

