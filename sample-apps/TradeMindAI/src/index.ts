import "reflect-metadata";
import "dotenv/config";
import { McpApplicationFactory } from "@nitrostack/core";
import { AppRoot } from "./app.module.js";

/**
 * TradeMind AI — Unified MCP Server
 * Combines all 6 domain tool modules (18 tools total) into a single
 * process/repo. One NitroStudio connection instead of six.
 *
 * NOTE: earlier versions of this file also stood up a hand-rolled Express
 * server with a /tool/* REST route per tool. That was redundant: NitroStack's
 * own dual transport (STDIO + HTTP) already exposes every @Tool-decorated
 * method as a real MCP tool over its /mcp endpoint on process.env.PORT. Running
 * both meant two servers fighting for the same port (EADDRINUSE), and forcing
 * stdio-only to dodge that collision instead killed the /mcp endpoint that
 * NitroCloud's deploy check needs to see alive. Removing the extra Express
 * server fixes both problems at once — there's only one server now.
 */

async function bootstrap() {
  // AppRoot is the @McpApp-decorated root class (see app.module.ts) — it
  // wraps UnifiedAppModule via `module:` and is what
  // McpApplicationFactory.create() requires.
  const appModule = await McpApplicationFactory.create(AppRoot);

  // appModule.start() reads NODE_ENV / MCP_TRANSPORT_TYPE to decide its
  // transport (stdio in dev, dual — STDIO + HTTP on process.env.PORT — in
  // production) and brings up all 18 registered tools on that transport.
  // Do NOT set MCP_TRANSPORT_TYPE=stdio in NitroCloud's env vars for this
  // service — leave it unset (or set to "dual") so the HTTP /mcp endpoint
  // NitroCloud checks against stays up.
  if (appModule && typeof (appModule as any).start === "function") {
    await (appModule as any).start();
  }
}

bootstrap().catch((err) => {
  console.error("Failed to start TradeMind Unified MCP Server:", err);
  process.exit(1);
});
