import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { Tool, NitroStackServer } from '@nitrostack/core';
import path from 'path';
import fs from 'fs';

const activeClients: Client[] = [];

// Ensure clients are closed when the process exits
const cleanup = async () => {
  for (const client of activeClients) {
    try {
      await client.close();
    } catch (e) {}
  }
};
process.on('SIGINT', () => cleanup().then(() => process.exit(0)));
process.on('SIGTERM', () => cleanup().then(() => process.exit(0)));

export async function registerExternalMcpTools(server: NitroStackServer) {
  const mcpConfigPath = path.resolve(process.cwd(), 'mcp.json');
  if (!fs.existsSync(mcpConfigPath)) {
    console.warn('mcp.json not found. Skipping external MCP tools registration.');
    return;
  }

  const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  const mcpServers = mcpConfig.mcpServers || {};

  for (const [serverName, serverCfg] of Object.entries<any>(mcpServers)) {
    // Skip the current server to avoid recursive infinite loops
    if (serverName === 'nitrostack') {
      continue;
    }

    console.log(`🔌 Initializing External MCP Gateway for [${serverName}]...`);

    // Resolve env variables
    const resolvedEnv: Record<string, string> = { ...process.env as Record<string, string> };
    let missingEnv = false;

    for (const [k, v] of Object.entries(serverCfg.env || {})) {
      if (typeof v === 'string' && v.startsWith('${') && v.endsWith('}')) {
        const envKey = v.slice(2, -1);
        const envVal = process.env[envKey];
        if (!envVal) {
          missingEnv = true;
          console.warn(`⚠️ Skipped [${serverName}] — Missing environment variable: ${envKey}`);
          break;
        }
        resolvedEnv[k] = envVal;
      } else {
        resolvedEnv[k] = v as string;
      }
    }

    if (missingEnv) continue;

    let transport: StdioClientTransport | SSEClientTransport | undefined;
    try {

      if (serverCfg.url) {
        // SSE Transport
        console.log(`Connecting to remote SSE server at ${serverCfg.url}`);
        
        // Resolve headers if they have environment variable references
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(serverCfg.headers || {})) {
          if (typeof v === 'string' && v.startsWith('${') && v.endsWith('}')) {
            const envKey = v.slice(2, -1);
            headers[k] = process.env[envKey] || '';
          } else {
            headers[k] = v as string;
          }
        }
        
        if (Object.keys(headers).length > 0) {
          transport = new SSEClientTransport(new URL(serverCfg.url), {
            eventSourceInit: { headers } as any,
            requestInit: { headers }
          });
        } else {
          transport = new SSEClientTransport(new URL(serverCfg.url));
        }
      } else {
        // STDIO Transport
        let command = serverCfg.command;
        if (process.platform === 'win32' && command === 'npx') {
          command = 'npx.cmd';
        }

        transport = new StdioClientTransport({
          command,
          args: serverCfg.args || [],
          env: resolvedEnv
        });
      }

      const client = new Client(
        { name: `nitrostack-gateway-${serverName}`, version: '1.0.0' }, 
        { capabilities: {} }
      );
      
      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Connection timed out after 30000ms`)), 30000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);

      const toolsResponse = await client.listTools();
      console.log(`✅ Loaded ${toolsResponse.tools.length} tools from [${serverName}].`);
      
      activeClients.push(client);

      for (const mcpTool of toolsResponse.tools) {
        // Prefix the tool name so it's clear it's from the external server and doesn't collide
        const toolName = `${serverName}_${mcpTool.name}`;
        
        const tool = new Tool({
          name: toolName,
          description: mcpTool.description || mcpTool.name,
          inputSchema: mcpTool.inputSchema as any,
          handler: async (input: any) => {
            console.log(`[Gateway] Executing ${toolName}...`);
            try {
              const result = await client.callTool({
                name: mcpTool.name,
                arguments: input
              });
              const output = (result.content as any[]).map(c => c.type === 'text' ? (c as any).text : JSON.stringify(c)).join('\n');
              return { success: true, result: output };
            } catch (error: any) {
              console.error(`[Gateway] Error executing ${toolName}:`, error);
              throw new Error(`Failed to execute external tool ${toolName}: ${error.message}`);
            }
          }
        });
        
        server.tool(tool);
      }
    } catch (error: any) {
      console.error(`❌ Failed to connect to [${serverName}]:`, error.message);
      // Ensure the transport is closed to prevent resource leaks (e.g. hanging SSE fetch loops or zombie child processes)
      try {
        if (transport) {
          await transport.close();
        }
      } catch (closeErr) {
        // ignore close errors
      }
    }
  }
}