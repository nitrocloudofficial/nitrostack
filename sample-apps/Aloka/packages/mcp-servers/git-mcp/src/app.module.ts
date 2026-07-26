import { McpApp, Module } from '@nitrostack/core';
import { GitModule } from './modules/git/git.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'git-mcp',
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
    GitModule
  ]
})
export class AppModule {}
