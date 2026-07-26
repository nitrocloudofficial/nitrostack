import { Module, McpApp, ConfigModule } from '@nitrostack/core';
import { HealthCheckService } from './health.check.js';
import { AuthService } from './services/auth.service.js';
import { IssueEventService } from './services/issue-event.service.js';

// 1. Import your new tools
import { ObservabilityTools } from './tools/observability.tool.js';
import { SourceControlTools } from './tools/source-control.tool.js';
import { RemediationTools } from './tools/remediation.tool.js';

// 2. Import your new resources
import { InfrastructureResources } from './resources/infrastructure.resource.js';
import { IssueStatusResource } from './tools/issue-status.resource.js';

// 3. Import your new prompts
import { WorkflowPrompts } from './prompts/investigate.prompt.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'Zero-Trust-Commander',
    version: '1.0.0'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot()
  ],
  providers: [
    // Health Checks
    HealthCheckService,
    // Services
    AuthService,
    IssueEventService
  ],
  controllers: [
    // 2. Register your new tools here so the AI can see them
    ObservabilityTools,
    SourceControlTools,
    RemediationTools,
    
    // 3. Register your resources
    InfrastructureResources,
    IssueStatusResource,

    // 4. Register your prompts
    WorkflowPrompts
  ]
})
export class AppModule { }