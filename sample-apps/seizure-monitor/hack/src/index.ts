import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

import "reflect-metadata";
import { McpApplicationFactory } from "@nitrostack/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start ERP Query AI MCP server:", error);
  process.exitCode = 1;
});
