import { McpApp, Module } from '@nitrostack/core';
import { CIModule } from './modules/ci/ci.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'ci-mcp',
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
    CIModule
  ]
})
export class AppModule {}
