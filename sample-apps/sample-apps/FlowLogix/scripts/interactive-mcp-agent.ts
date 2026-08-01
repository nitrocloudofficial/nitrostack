import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import { Transform } from 'stream';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpConfigFile {
  mcpServers: Record<string, McpServerConfig>;
}

/**
 * Helper to discover and wrap MCP tools from an active MCP Client
 */
async function loadMcpTools(mcpClient: Client, prefix = ''): Promise<DynamicStructuredTool[]> {
  const toolsResponse = await mcpClient.listTools();
  const tools: DynamicStructuredTool[] = [];

  for (const mcpTool of toolsResponse.tools) {
    let zodSchema: z.ZodObject<any> = z.object({});
    if (mcpTool.inputSchema && typeof mcpTool.inputSchema === 'object') {
      const properties = (mcpTool.inputSchema as any).properties || {};
      const shape: Record<string, z.ZodTypeAny> = {};

      for (const [key, prop] of Object.entries<any>(properties)) {
        let fieldSchema: z.ZodTypeAny = z.any();
        if (prop.type === 'string') fieldSchema = z.string();
        else if (prop.type === 'number') fieldSchema = z.number();
        else if (prop.type === 'boolean') fieldSchema = z.boolean();
        else if (prop.type === 'array') fieldSchema = z.array(z.any());

        if (prop.description) {
          fieldSchema = fieldSchema.describe(prop.description);
        }
        shape[key] = fieldSchema;
      }
      zodSchema = z.object(shape);
    }

    // Give clear tool names (e.g., slack_post_message or nitrostack_check_inbound_delays)
    const displayName = prefix && prefix !== 'nitrostack' ? `${prefix}_${mcpTool.name}` : mcpTool.name;
    const lcTool = new DynamicStructuredTool({
      name: displayName,
      description: mcpTool.description || mcpTool.name,
      schema: zodSchema,
      func: async (args: Record<string, any>) => {
        console.log(`\n⚙️  [MCP TOOL CALL] ${displayName}`, JSON.stringify(args, null, 2));
        try {
          const result = await mcpClient.callTool({
            name: mcpTool.name,
            arguments: args,
          });
          const outputContent = result.content
            .map((c: any) => (c.type === 'text' ? c.text : JSON.stringify(c)))
            .join('\n');
          console.log(`✅ [MCP RESULT] ${displayName}:\n`, outputContent);
          return outputContent;
        } catch (error: any) {
          console.error(`❌ [MCP ERROR] ${displayName}:`, error.message);
          return `Error executing tool ${displayName}: ${error.message}`;
        }
      },
    });

    tools.push(lcTool);
  }
  return tools;
}

/**
 * 💬 FlowLogix Interactive Multi-Turn Agent Session
 *
 * Dynamically reads `mcp.json` to spawn and aggregate MCP servers
 * (NitroStack, GitHub, Slack, etc.) into a single LangGraph Agent loop.
 */
async function startInteractiveSession() {
  console.clear();
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🤖 FlowLogix Interactive Multi-Turn Agent Session (Multi-MCP + LangGraph)');
  console.log('════════════════════════════════════════════════════════════════════\n');

  const mcpConfigPath = path.join(projectRoot, 'mcp.json');
  if (!fs.existsSync(mcpConfigPath)) {
    console.error('❌ mcp.json file not found at project root!');
    process.exit(1);
  }

  const mcpConfig: McpConfigFile = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  const activeClients: Client[] = [];
  const activeChildren: ChildProcess[] = [];
  const langchainTools: DynamicStructuredTool[] = [];

  // Iterate over servers defined in mcp.json
  for (const [serverName, serverCfg] of Object.entries(mcpConfig.mcpServers)) {
    console.log(`🔌 Initializing MCP Server [${serverName}]...`);

    // Build environment object, resolving ${ENV_VAR} templates
    const resolvedEnv: Record<string, string> = { ...process.env as Record<string, string> };
    let missingEnv = false;

    if (serverCfg.env) {
      for (const [k, v] of Object.entries(serverCfg.env)) {
        if (v.startsWith('${') && v.endsWith('}')) {
          const envKey = v.slice(2, -1);
          const envVal = process.env[envKey];
          if (!envVal) {
            missingEnv = true;
            console.log(`ℹ️  Skipped [${serverName}] — Missing environment variable: ${envKey}`);
            break;
          }
          resolvedEnv[k] = envVal;
        } else {
          resolvedEnv[k] = v;
        }
      }
    }

    if (missingEnv) continue;

    // Adjust command for Windows if launching node/npx
    let command = serverCfg.command;
    if (!command) {
      console.log(`ℹ️  Skipped [${serverName}] — No command defined (likely an SSE server managed by the gateway).`);
      continue;
    }

    if (process.platform === 'win32') {
      if (command === 'npx') command = 'npx.cmd';
      if (command === 'npm') command = 'npm.cmd';
    }

    const args = (serverCfg.args || []).map((arg) =>
      arg === 'dist/index.js' ? path.join(projectRoot, 'dist', 'index.js') : arg
    );

    try {
      const child = spawn(command, args, {
        env: resolvedEnv,
        stdio: ['pipe', 'pipe', 'inherit'],
        shell: process.platform === 'win32',
      });
      activeChildren.push(child);

      const filteredStdout = new Transform({
        transform(chunk, _encoding, callback) {
          const text = chunk.toString();
          const lines = text.split(/\r?\n/);
          const jsonLines = lines
            .filter((l) => l.trim() && !l.includes('NITRO_LOG::'))
            .join('\n');
          if (jsonLines) {
            this.push(jsonLines + '\n');
          }
          callback();
        },
      });
      child.stdout.pipe(filteredStdout);

      const transport = {
        start: async () => { },
        close: async () => {
          child.kill();
        },
        send: async (message: any) => {
          child.stdin.write(JSON.stringify(message) + '\n');
        },
        onmessage: undefined as any,
        onerror: undefined as any,
        onclose: undefined as any,
      };

      filteredStdout.on('data', (chunk) => {
        const lines = chunk.toString().split(/\r?\n/);
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (transport.onmessage) transport.onmessage(json);
          } catch (err) {
            // ignore non-json
          }
        }
      });

      child.on('close', () => {
        if (transport.onclose) transport.onclose();
      });

      const client = new Client(
        { name: `client-${serverName}`, version: '1.0.0' },
        { capabilities: { tools: {} } }
      );

      await client.connect(transport);
      activeClients.push(client);

      const tools = await loadMcpTools(client, serverName);
      console.log(`✅ Connected [${serverName}] — Loaded ${tools.length} tool(s).`);
      langchainTools.push(...tools);
    } catch (err: any) {
      console.warn(`⚠️  Failed to launch MCP Server [${serverName}]: ${err.message}`);
    }
  }

  console.log(`\n🛠️  Total MCP Tools registered across all servers: ${langchainTools.length}`);

  // Initialize Model with MemorySaver for session checkpointing
  const apiKey = process.env.OPENAI_API_KEY || 'ollama';
  const baseURL = process.env.OPENAI_BASE_URL;
  const modelName = process.env.DEFAULT_MODEL || process.env.OPENAI_MODEL || 'gemma4:e2b';

  console.log(`🤖 LLM Model: ${modelName} (${baseURL || 'https://api.openai.com'})`);

  const model = new ChatOpenAI({
    modelName,
    temperature: 0.1,
    apiKey,
    configuration: baseURL ? { baseURL } : undefined,
  });

  const checkpointer = new MemorySaver();
  const agent = createReactAgent({
    llm: model,
    tools: langchainTools,
    checkpointSaver: checkpointer,
  });

  const rl = readline.createInterface({ input, output });
  const threadId = `session-${Date.now()}`;

  console.log('\n✨ Multi-MCP Session active! Type your prompt below. Type "exit" or "quit" to end.\n');

  while (true) {
    const userInput = await rl.question('\nUser > ');
    const trimmed = userInput.trim();

    if (!trimmed) continue;
    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      console.log('Exiting interactive session...');
      break
    }

    try {
      const agentState = await agent.invoke(
        { messages: [new HumanMessage(trimmed)] },
        { configurable: { thread_id: threadId } }
      );

      const lastMessage = agentState.messages[agentState.messages.length - 1];
      console.log(`\nAgent > ${lastMessage.content}`);
    } catch (error: any) {
      console.warn(`\n⚠️  Error processing turn: ${error.message || error}`);
    }
  }

  rl.close();
  for (const c of activeClients) {
    await c.close();
  }
  for (const child of activeChildren) {
    child.kill();
  }
  console.log('👋 Session closed cleanly.');
  process.exit(0);
}

startInteractiveSession().catch(async (err) => {
  console.error('💥 Session Error:', err);
  process.exit(1);
});
