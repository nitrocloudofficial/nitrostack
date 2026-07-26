import { McpApp, Module, ConfigModule } from "@nitrostack/core";

import { DiscoveryModule } from "./modules/discovery/discovery.module.js";
import { SecurityModule } from "./modules/security/security.module.js";
import { AuditModule } from "./modules/audit/audit.module.js";
import { PolicyModule } from "./modules/policy/policy.module.js";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { ReportingModule } from "./modules/reporting/reporting.module.js";
import { DatabaseService } from "./shared/services/database.service.js";
import { ConnectorsModule } from "./modules/connectors/connectors.module.js";
import { AnalyticsModule } from "./modules/analytics/analytics.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { SystemHealthCheck } from "./health/system.health.js";

@McpApp({
  module: AppModule,
  server: {
    name: "agent-sentinel",
    version: "1.0.0",
  },
  logging: {
    level: "info",
  },
})
@Module({
  name: "app",
  description: "AgentSentinel MCP Server",

  imports: [
    ConfigModule.forRoot(),

    DiscoveryModule,
    DatabaseService,
    SecurityModule,
    ConnectorsModule,
    AnalyticsModule,
    AuditModule,
    PolicyModule,
    DashboardModule,
    NotificationsModule,
    ReportingModule,
  ],

  providers: [SystemHealthCheck],
})
export class AppModule {}