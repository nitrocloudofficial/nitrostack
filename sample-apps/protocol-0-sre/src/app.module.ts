import { McpApp, Module, ConfigModule } from "@nitrostack/core";
import { ProtocolZeroModule } from "./modules/protocol-zero.module.js";
import { SystemHealthCheck } from "./health/system.health.js";

/**
 * Root Application Module — Protocol-0 Autonomous SRE Copilot.
 * The MCP client acts as the reasoning engine; this server is the autonomous capability and execution layer.
 */
@McpApp({
  module: AppModule,
  server: {
    name: "protocol-0-SRE", 
    version: "1.0.0",
  },
  logging: {
    level: "info",
  },
})
@Module({
  name: "app",
  description: "Protocol-0 — MCP-native Autonomous SRE Copilot (Amrita MCP Hackathon 2026, Enterprise AI & Workplace Automation).",
  imports: [ConfigModule.forRoot(), ProtocolZeroModule],
  providers: [
    SystemHealthCheck,
  ],
})
export class AppModule {}
