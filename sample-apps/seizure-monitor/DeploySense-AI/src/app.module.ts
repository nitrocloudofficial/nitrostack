import { McpApp, Module, ConfigModule as NitroConfigModule } from '@nitrostack/core';
import { GithubModule } from './modules/github/github.module.js';
import { LogsModule } from './modules/logs/logs.module.js';
import { MetricsModule } from './modules/metrics/metrics.module.js';
import { KubernetesModule } from './modules/kubernetes/kubernetes.module.js';
import { JiraModule } from './modules/jira/jira.module.js';
import { SlackModule } from './modules/slack/slack.module.js';
import { InvestigationModule } from './modules/investigation/investigation.module.js';
import { ReportModule } from './modules/report/report.module.js';
import { ConfigModule } from './modules/config/config.module.js';

@McpApp({
  module: AppModule,
  server: {
    name: 'deploysense-ai',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'DeploySense AI Root Application Module',
  imports: [
    NitroConfigModule.forRoot(),
    ConfigModule,
    GithubModule,
    LogsModule,
    MetricsModule,
    KubernetesModule,
    JiraModule,
    SlackModule,
    InvestigationModule,
    ReportModule
  ]
})
export class AppModule {}
