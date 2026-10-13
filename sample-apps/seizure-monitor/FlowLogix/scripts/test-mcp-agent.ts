import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import { Transform } from 'stream';

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
          const outputContent = (result.content as any[])
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
 * 🚀 FlowLogix Single Test Agent
 *
 * Dynamically reads `mcp.json` to spawn and aggregate MCP servers
 * (NitroStack, Slack, GitHub, etc.) for single-prompt testing.
 */
async function runTestAgent() {
  console.log('🔌 Connecting to MCP Servers defined in mcp.json...');

  const mcpConfigPath = path.join(projectRoot, 'mcp.json');
  if (!fs.existsSync(mcpConfigPath)) {
    console.error('❌ mcp.json file not found at project root!');
    process.exit(1);
  }

  const mcpConfig: McpConfigFile = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  const activeClients: Client[] = [];
  const activeChildren: ChildProcess[] = [];
  const langchainTools: DynamicStructuredTool[] = [];

  for (const [serverName, serverCfg] of Object.entries(mcpConfig.mcpServers)) {
    console.log(`🔌 Initializing MCP Server [${serverName}]...`);

    const resolvedEnv: Record<string, string> = { ...(process.env as Record<string, string>) };
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
            .filter((l: string) => l.trim() && !l.includes('NITRO_LOG::'))
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
        { capabilities: {} }
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

  console.log(`\n🛠️  Total MCP Tools registered: ${langchainTools.length}`);

  const apiKey = process.env.OPENAI_API_KEY || 'ollama';
  const baseURL = process.env.OPENAI_BASE_URL;
  const modelName = process.env.DEFAULT_MODEL || process.env.OPENAI_MODEL || 'gemma4:e2b';

  console.log(`🤖 Initializing LLM Model (${modelName}) at ${baseURL || 'https://api.openai.com'}...`);

  const model = new ChatOpenAI({
    modelName,
    temperature: 0.1,
    apiKey,
    configuration: baseURL ? { baseURL } : undefined,
  });

  const agent = createReactAgent({
    llm: model,
    tools: langchainTools,
  });

  const userPrompt =
    process.argv.slice(2).join(' ') ||
    'Check inbound delay for truck TRK-9988 running 45 minutes late.';

  console.log(`\n🤖 Running Agent Prompt: "${userPrompt}"\n${'─'.repeat(60)}`);

  try {
    const agentState = await agent.invoke({
      messages: [new HumanMessage(userPrompt)],
    });

    const lastMessage = agentState.messages[agentState.messages.length - 1];
    console.log(`\n${'─'.repeat(60)}\n🏁 [FINAL AGENT RESPONSE]:\n`);
    console.log(lastMessage.content);
  } catch (error: any) {
    console.warn(`\n⚠️  LLM Connection Warning: Could not reach LLM endpoint (${baseURL || 'OpenAI'}).`);
    console.warn(`   Error Details: ${error.message || error}`);
  }

  for (const c of activeClients) {
    await c.close();
  }
  for (const child of activeChildren) {
    child.kill();
  }
  console.log('\n👋 All MCP connections closed cleanly.');
}

runTestAgent().catch(async (error) => {
  console.error('💥 Test Agent Failed:', error);
  process.exit(1);
});
