import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as http from 'http';
import { URL } from 'url';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
  handler: (args: any) => Promise<any>;
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  mimeType: string;
  description: string;
  handler: () => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required?: boolean }>;
  handler: (args: any) => Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }>;
}

export class NitroServer {
  private server: Server;
  private options: { name: string; version: string; description: string };
  private tools: Map<string, ToolDefinition> = new Map();
  private resources: Map<string, ResourceDefinition> = new Map();
  private prompts: Map<string, PromptDefinition> = new Map();
  private sseTransports: Map<string, SSEServerTransport> = new Map();

  constructor(options: { name: string; version: string; description: string }) {
    this.options = options;
    this.server = new Server(
      { name: options.name, version: options.version },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );

    this.setupHandlersForServer(this.server);
  }

  public registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public registerResource(resource: ResourceDefinition) {
    this.resources.set(resource.uri, resource);
  }

  public registerPrompt(prompt: PromptDefinition) {
    this.prompts.set(prompt.name, prompt);
  }

  public getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getResources(): ResourceDefinition[] {
    return Array.from(this.resources.values());
  }

  public getPrompts(): PromptDefinition[] {
    return Array.from(this.prompts.values());
  }

  private setupHandlersForServer(targetServer: Server) {
    targetServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools().map(t => ({
          name: t.name,
          description: t.description,
          inputSchema: t.parameters
        }))
      };
    });

    targetServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = this.tools.get(request.params.name);
      if (!tool) {
        throw new Error(`Tool ${request.params.name} not found`);
      }
      const result = await tool.handler(request.params.arguments || {});
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      };
    });

    targetServer.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: this.getResources().map(r => ({
          uri: r.uri,
          name: r.name,
          mimeType: r.mimeType,
          description: r.description
        }))
      };
    });

    targetServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resource = this.resources.get(request.params.uri);
      if (!resource) {
        throw new Error(`Resource ${request.params.uri} not found`);
      }
      return await resource.handler();
    });

    targetServer.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: this.getPrompts().map(p => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments
        }))
      };
    });

    targetServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const prompt = this.prompts.get(request.params.name);
      if (!prompt) {
        throw new Error(`Prompt ${request.params.name} not found`);
      }
      return await prompt.handler(request.params.arguments || {});
    });
  }

  private createChildServer(): Server {
    const s = new Server(
      { name: this.options.name, version: this.options.version },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    this.setupHandlersForServer(s);
    return s;
  }

  public async start() {
    const stdioTransport = new StdioServerTransport();
    await this.server.connect(stdioTransport);
    console.error(`[NitroStack] MCP Server started over official MCP STDIO transport.`);

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

    const httpServer = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Expose-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const reqUrl = req.url || '/';
      const parsedUrl = new URL(reqUrl, `http://localhost:${port}`);

      const acceptHeader = req.headers.accept || '';
      const isSseRoute = acceptHeader.includes('text/event-stream') ||
        ['/sse', '/mcp', '/mcp/sse', '/api/sse', '/api/mcp'].includes(parsedUrl.pathname);

      if (isSseRoute && req.method === 'GET') {
        console.error(`[NitroStack] SSE connection initializing on route: ${parsedUrl.pathname}`);
        const sseTransport = new SSEServerTransport('/messages', res);
        this.sseTransports.set(sseTransport.sessionId, sseTransport);

        sseTransport.onclose = () => {
          console.error(`[NitroStack] SSE Session ${sseTransport.sessionId} closed.`);
          this.sseTransports.delete(sseTransport.sessionId);
        };

        const childServer = this.createChildServer();
        await childServer.connect(sseTransport);
        return;
      }

      if ((parsedUrl.pathname.includes('/messages') || parsedUrl.pathname.includes('/message')) && req.method === 'POST') {
        const sessionId = parsedUrl.searchParams.get('sessionId');
        const sseTransport = sessionId ? this.sseTransports.get(sessionId) : Array.from(this.sseTransports.values())[0];

        if (sseTransport) {
          await sseTransport.handlePostMessage(req, res);
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No active SSE transport session found.' }));
        }
        return;
      }

      if (parsedUrl.pathname === '/health' || parsedUrl.pathname === '/' || parsedUrl.pathname === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          server: this.options.name,
          version: this.options.version,
          mcp: true
        }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    });

    httpServer.listen(port, () => {
      console.error(`[NitroStack] Container HTTP & SSE endpoints active listening on port ${port}`);
    });
  }
}
