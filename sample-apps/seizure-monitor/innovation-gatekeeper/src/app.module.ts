import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { GitHubAuditorModule } from './modules/github-auditor/github-auditor.module.js';
import { RubricEvaluatorModule } from './modules/rubric-evaluator/rubric-evaluator.module.js';
import { TriageRouterModule } from './modules/triage-router/triage-router.module.js';
import { SystemHealthCheck } from './health/system.health.js';

@McpApp({
  module: AppModule,
  server: {
    name: "innovation-gatekeeper",
    version: "1.0.0"
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: "Innovation Gatekeeper MCP Server",
  imports: [
    ConfigModule.forRoot(),
    GitHubAuditorModule,
    RubricEvaluatorModule,
    TriageRouterModule
  ],
  providers: [
    SystemHealthCheck
  ]
})
export class AppModule { }