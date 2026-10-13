import { defineConfig } from "@nitrostack/core";

export default defineConfig({
  name: "frontend-intelligence-mcp",
  version: "1.0.0",
  description: "AI Frontend Architect MCP Server for NitroStack × SRMIST Hackathon",
  transport: process.env.NITROSTACK_TRANSPORT === "http" ? "http" : "stdio",
  widgets: {
    dir: "./widgets",
  },
  logging: {
    level: (process.env.LOG_LEVEL as "info" | "debug" | "warn" | "error") || "info",
  },
});

