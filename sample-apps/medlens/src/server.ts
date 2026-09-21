import express from "express";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMedLensServer } from "./app.module";

function getArg(flag: string, fallback: string): string {
  const prefix = `--${flag}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

async function runStdio() {
  const server = createMedLensServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Intentionally no stdout logging here — stdio transport uses stdout for
  // the MCP protocol itself. Use stderr for any diagnostic logging.
  process.stderr.write("MedLens MCP server running on stdio\n");
}

async function runHttp(port: number) {
  const app = express();
  app.use(express.json());

  // Stateless mode: a fresh server + transport per request is the simplest
  // correct thing for a small tool server like this one — no session
  // affinity to manage, and it plays well with typical serverless/edge
  // deployment targets.
  app.post("/mcp", async (req, res) => {
    const server = createMedLensServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok", service: "medlens-mcp" });
  });

  app.listen(port, () => {
    process.stderr.write(`MedLens MCP server listening on http://localhost:${port}/mcp\n`);
  });
}

const transportArg = getArg("transport", "stdio");
const port = Number(getArg("port", "3333"));

if (transportArg === "http") {
  runHttp(port).catch((err) => {
    process.stderr.write(`Fatal error starting HTTP transport: ${String(err)}\n`);
    process.exit(1);
  });
} else {
  runStdio().catch((err) => {
    process.stderr.write(`Fatal error starting stdio transport: ${String(err)}\n`);
    process.exit(1);
  });
}
