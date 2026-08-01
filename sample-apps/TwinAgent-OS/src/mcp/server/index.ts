import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { mcpRegistry } from '../registry/index.js';
import { mcpHandlers } from '../handlers/index.js';
import { mcpResourceHandlers } from '../resources/index.js';
import { mcpPromptHandlers } from '../prompts/index.js';
import { formatMCPError } from '../adapters/index.js';

export function createMCPServer() {
  const server = new Server(
    {
      name: 'twinagent-os-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // 1. List Tools Handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: mcpRegistry.getTools().map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  // 2. Call Tool Handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'predictProjectRisk':
        return await mcpHandlers.predictProjectRisk(args);
      case 'predictBurnout':
        return await mcpHandlers.predictBurnout(args);
      case 'updateTask':
        return await mcpHandlers.updateTask(args);
      case 'searchKnowledge':
        return await mcpHandlers.searchKnowledge(args);
      case 'organizationHealth':
        return await mcpHandlers.organizationHealth(args);
      case 'summarizeProject':
        return await mcpHandlers.summarizeProject(args);
      case 'recommendAssignee':
        return await mcpHandlers.recommendAssignee(args);
      case 'findExpert':
        return await mcpHandlers.findExpert(args);
      case 'runWorkflow':
        return await mcpHandlers.runWorkflow(args);
      case 'approveAction':
        return await mcpHandlers.approveAction(args);
      case 'syncConnector':
        return await mcpHandlers.syncConnector(args);
      case 'calculateDigitalTwin':
        return await mcpHandlers.calculateDigitalTwin(args);
      case 'getGraph':
        return await mcpHandlers.getGraph(args);
      case 'globalSearch':
        return await mcpHandlers.globalSearch(args);
      case 'getAuditLogs':
        return await mcpHandlers.getAuditLogs(args);
      default:
        return formatMCPError(`Unknown tool requested: ${name}`);
    }
  });

  // 3. List Resources Handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: mcpRegistry.getResources().map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      })),
    };
  });

  // 4. Read Resource Handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    return await mcpResourceHandlers.readResource(uri, 'default-org-id');
  });

  // 5. List Prompts Handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: mcpRegistry.getPrompts().map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments,
      })),
    };
  });

  // 6. Get Prompt Handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return mcpPromptHandlers.getPrompt(name, (args || {}) as Record<string, string>);
  });

  return server;
}

export async function startStdioMCPServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Server] TwinAgent OS Official MCP Server started over Stdio JSON-RPC transport.');
}

const sseTransports = new Map<string, SSEServerTransport>();

export async function handleMCPSSE(req: any, reply: any) {
  const transport = new SSEServerTransport('/api/v1/mcp/messages', reply.raw);
  const server = createMCPServer();
  await server.connect(transport);
  sseTransports.set(transport.sessionId, transport);

  req.raw.on('close', () => {
    sseTransports.delete(transport.sessionId);
  });
}

export async function handleMCPMessages(req: any, reply: any) {
  const sessionId = req.query.sessionId as string;
  const transport = sseTransports.get(sessionId);
  if (!transport) {
    return reply.status(400).send({ error: `Session not found: ${sessionId}` });
  }
  await transport.handlePostMessage(req.raw, reply.raw);
}
