import { NitroStackServer } from "@nitrostack/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const server = new NitroStackServer({
    name: "frontend-intelligence-mcp",
    version: "1.0.0",
    description: "AI Frontend Architect MCP Server",
  });

  server.module(AppModule);
  await server.start();
}

bootstrap().catch((err) => {
  console.error("Failed to start Frontend Intelligence MCP Server:", err);
  process.exit(1);
});
