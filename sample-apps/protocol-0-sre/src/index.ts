/**
 * Protocol-0 — Autonomous SRE Copilot
 *
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 *
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import "dotenv/config";
import { McpApplicationFactory } from "@nitrostack/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();

  const app = (server as any).getHttpTransport?.()?.getApp?.();
  if (app) {
    app.get("/api/export/incident/:incidentId", (req: any, res: any) => {
      const incidentId = String(req.params.incidentId ?? "");
      if (!/^[A-Za-z0-9-]{1,64}$/.test(incidentId)) {
        res.status(400).json({ error: "BAD_INCIDENT_ID" });
        return;
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(
        JSON.stringify(
          {
            status: "success",
            export_type: "POST_MORTEM",
            incident_id: incidentId,
            message: "Secure audit export generated successfully.",
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    });
    console.log(
      "Custom HTTP Route Mounted: GET /api/export/incident/:incidentId",
    );
  }
}

bootstrap().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
