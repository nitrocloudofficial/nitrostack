import { McpApp, Module } from "@nitrostack/core";
import { ErpModule } from "./modules/erp/erp.module.js";

@McpApp({
  module: AppModule,
  server: { name: "erp-query-ai", version: "1.0.0" },
  logging: { level: process.env.LOG_LEVEL === "debug" ? "debug" : "info" },
  transport: {
    type: "http",
    http: {
      host: process.env.HOST ?? "0.0.0.0",
      port: Number(process.env.PORT ?? 3000),
      basePath: process.env.MCP_BASE_PATH ?? "/mcp",
    },
  },
})
@Module({
  name: "erp-query-ai",
  description: "NitroStack MCP server for ERP natural-language data queries.",
  imports: [ErpModule],
})
export class AppModule {}
