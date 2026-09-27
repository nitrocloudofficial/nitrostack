import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { SERVERS, LOGS, addLog, type ServerRecord } from './nitrowatch.store.js';

export class NitroWatchTools {
  @Tool({
    name: 'register_server',
    description: 'Register an MCP server with NitroWatch so it can be watched',
    inputSchema: z.object({
      name: z.string(),
      endpoint: z.string().url(),
      apiKey: z.string().optional(),
    }),
  })
  async registerServer(input: any, ctx: ExecutionContext) {
    const id = input.name.toLowerCase().replace(/\s+/g, '-');
    const record: ServerRecord = {
      id,
      name: input.name,
      endpoint: input.endpoint,
      apiKey: input.apiKey,
      registeredAt: new Date().toISOString(),
    };
    SERVERS.set(id, record);
    LOGS.set(id, []);
    ctx.logger.info('registered server', { id });
    return record;
  }

  @Tool({
    name: 'discover_capabilities',
    description: "Connect to a registered server's real MCP endpoint and list its tools/resources/prompts",
    inputSchema: z.object({ serverId: z.string() }),
  })
  async discoverCapabilities(input: any, ctx: ExecutionContext) {
    const server = SERVERS.get(input.serverId);
    if (!server) throw new Error(`Unknown server: ${input.serverId}`);

    try {
      const transport = new SSEClientTransport(new URL(server.endpoint), {
        requestInit: server.apiKey
          ? { headers: { Authorization: `Bearer ${server.apiKey}` } }
          : undefined,
      });
      const client = new Client({ name: 'nitrowatch', version: '1.0.0' });
      await client.connect(transport);

      const [tools, resources, prompts] = await Promise.all([
        client.listTools(),
        client.listResources(),
        client.listPrompts(),
      ]);

      const discovered = { tools: tools.tools, resources: resources.resources, prompts: prompts.prompts };
      server.capabilities = discovered;
      ctx.logger.info('discovered capabilities', { serverId: server.id });
      await client.close();
      return discovered;
    } catch (err: any) {
      addLog(server.id, 'error', `discover_capabilities failed: ${err.message}`);
      ctx.logger.error('discover_capabilities failed', { serverId: server.id, error: err.message });
      throw err;
    }
  }

  @Tool({
    name: 'get_burn_rate',
    description: "Project time-to-exhaustion on the team's 5M AI token budget",
    inputSchema: z.object({ used: z.number(), budgetTotal: z.number().default(5_000_000) }),
  })
  async getBurnRate(input: any, ctx: ExecutionContext) {
    const used = input.used ?? 0;
    const budgetTotal = input.budgetTotal ?? 5_000_000;
    const remaining = budgetTotal - used;
    const percentUsed = budgetTotal > 0 ? used / budgetTotal : 0;
    return { remaining, budgetTotal, percentUsed };
  }

  @Tool({
    name: 'generate_glue',
    description: 'Generate a stub connector function that calls a tool on one registered server and pipes its result into a tool on another',
    inputSchema: z.object({
      sourceServerId: z.string(),
      targetServerId: z.string(),
      sourceTool: z.string(),
      targetTool: z.string(),
    }),
  })
  async generateGlue(input: any, ctx: ExecutionContext) {
    const source = SERVERS.get(input.sourceServerId);
    const target = SERVERS.get(input.targetServerId);
    if (!source) throw new Error(`Unknown source server: ${input.sourceServerId}`);
    if (!target) throw new Error(`Unknown target server: ${input.targetServerId}`);

    const safeSourceId = source.id.replace(/-/g, '_');
    const safeTargetId = target.id.replace(/-/g, '_');
    const code = [
      `async function glue_${safeSourceId}_to_${safeTargetId}(input: Record<string, unknown>) {`,
      `  // Calls '${input.sourceTool}' on ${source.name}, pipes result into '${input.targetTool}' on ${target.name}`,
      `  const result = await callTool('${source.id}', '${input.sourceTool}', input);`,
      `  // TODO: map result fields to ${input.targetTool}'s expected input shape`,
      `  return await callTool('${target.id}', '${input.targetTool}', result);`,
      `}`,
    ].join('\n');

    ctx.logger.info('generated glue code', { source: source.id, target: target.id });
    return { code };
  }
}