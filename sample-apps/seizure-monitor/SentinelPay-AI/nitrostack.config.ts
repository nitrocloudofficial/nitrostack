import { defineConfig } from "@nitrostack/cli";

export default defineConfig({
  server: {
    entry: "./src/index.ts",

    transport: "dual",

    http: {
      host: "0.0.0.0",
      port: 3000,
      basePath: "/mcp",
    },
  },

  widgets: {
    enabled: true,
    root: "./src/widgets",
    port: 3001,
  },

  studio: {
    enabled: true,
  },
});