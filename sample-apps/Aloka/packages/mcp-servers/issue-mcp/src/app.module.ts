import { McpApp, Module } from '@nitrostack/core';
import { IssueModule } from './modules/issue/issue.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'issue-mcp',
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
    IssueModule
  ]
})
export class AppModule {}
