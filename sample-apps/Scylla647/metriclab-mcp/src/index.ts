import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { physicsTools } from "./physics.tools.js";

const server = new Server(
  { name: "metriclab-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler({ method: "tools/list" } as any, async () => ({
  tools: physicsTools.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler({ method: "tools/call" } as any, async (req: any) => {
  const tool = physicsTools.find((t) => t.name === req.params.name);
  if (!tool) throw new Error(`Unknown tool: ${req.params.name}`);
  const result = await tool.handler(req.params.arguments ?? {});
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
