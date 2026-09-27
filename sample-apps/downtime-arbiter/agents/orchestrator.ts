import 'dotenv/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const GROQ_MODEL = 'qwen/qwen3.6-27b';
const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_AGENT_STEPS = 8;

type AgentRole = 'Maintenance' | 'Production';
type McpTool = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};

type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

type GroqChoice = {
  message: ChatMessage;
  finish_reason?: string;
};

type GroqResponse = {
  choices?: GroqChoice[];
  error?: {
    message?: string;
  };
};

type ToolResultPayload = {
  [key: string]: unknown;
};

const machineId = process.argv[2] ?? 'MACH_001';

function requireGroqKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('Missing GROQ_API_KEY. Add it to .env before running npm run agent-demo.');
  }
  return key;
}

function toOpenAiTool(tool: McpTool) {
  return {
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description ?? `Call ${tool.name}`,
      parameters: tool.inputSchema,
    },
  };
}

function parseToolArguments(rawArgs: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawArgs);
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function ensureProposalRole(
  role: AgentRole,
  toolName: string,
  args: Record<string, unknown>,
): Record<string, unknown> {
  if (toolName !== 'propose_window') {
    return args;
  }

  return {
    ...args,
    role,
    machine_id: typeof args.machine_id === 'string' ? args.machine_id : machineId,
  };
}

function stringifyToolResult(result: unknown): string {
  if (
    typeof result === 'object' &&
    result !== null &&
    'structuredContent' in result &&
    typeof (result as { structuredContent?: unknown }).structuredContent === 'object'
  ) {
    return JSON.stringify((result as { structuredContent: unknown }).structuredContent, null, 2);
  }

  if (typeof result === 'object' && result !== null && 'content' in result) {
    const content = (result as { content?: Array<{ type: string; text?: string }> }).content ?? [];
    const text = content
      .filter((item) => item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join('\n');

    if (text) {
      return text;
    }
  }

  return JSON.stringify(result, null, 2);
}

function parseToolPayload(result: unknown): ToolResultPayload {
  const text = stringifyToolResult(result);
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null ? parsed as ToolResultPayload : { text };
  } catch {
    return { text };
  }
}

async function callGroq(
  apiKey: string,
  messages: ChatMessage[],
  tools: ReturnType<typeof toOpenAiTool>[],
  forcedToolName?: string,
): Promise<ChatMessage> {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      tools,
      tool_choice: forcedToolName
        ? { type: 'function', function: { name: forcedToolName } }
        : 'auto',
      temperature: 0.2,
      max_completion_tokens: 512,
    }),
  });

  const body = await response.json() as GroqResponse;
  if (!response.ok) {
    throw new Error(`Groq request failed (${response.status}): ${body.error?.message ?? JSON.stringify(body)}`);
  }

  const message = body.choices?.[0]?.message;
  if (!message) {
    throw new Error(`Groq returned no message: ${JSON.stringify(body)}`);
  }

  return message;
}

async function callGroqWithRetry(
  apiKey: string,
  messages: ChatMessage[],
  tools: ReturnType<typeof toOpenAiTool>[],
  forcedToolName?: string,
): Promise<ChatMessage> {
  try {
    return await callGroq(apiKey, messages, tools, forcedToolName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Failed to call a function')) {
      throw error;
    }

    const retryMessages = [
      ...messages,
      {
        role: 'user' as const,
        content:
          'Your previous function call was invalid. Call the requested tool once with strict JSON arguments only. Do not add prose.',
      },
    ];

    return callGroq(apiKey, retryMessages, tools, forcedToolName);
  }
}

async function callMcpTool(
  client: Client,
  roleLabel: string,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResultPayload> {
  console.log(`\n[${roleLabel}] TOOL CALL ${name}`);
  console.log(JSON.stringify(args, null, 2));

  const result = await client.callTool({ name, arguments: args });
  const textResult = stringifyToolResult(result);

  console.log(`[${roleLabel}] TOOL RESULT ${name}`);
  console.log(textResult);

  return parseToolPayload(result);
}

function agentSystemPrompt(role: AgentRole, id: string): string {
  if (role === 'Maintenance') {
    return `You are the Maintenance agent for machine ${id}. You can ONLY call get_machine_signal, explain_risk_trajectory, and propose_window. Argue for the earliest safe downtime window using the risk trajectory. Do not attempt to call any other tool.`;
  }

  return `You are the Production agent for machine ${id}. You can ONLY call get_urgency_tier, check_plan_constraints, and propose_window. You only know the urgency tier, never raw risk data. Argue for the latest safe delay based on job deadlines and revenue impact from fixtures.ts. Do not attempt to call any other tool.`;
}

async function runAgentProposal(
  client: Client,
  apiKey: string,
  role: AgentRole,
  round: 1 | 2,
  availableTools: McpTool[],
  priorContext: string,
): Promise<ToolResultPayload> {
  const allowedToolNames =
    role === 'Maintenance'
      ? ['get_machine_signal', 'explain_risk_trajectory', 'propose_window']
      : ['get_urgency_tier', 'check_plan_constraints', 'propose_window'];

  const tools = availableTools
    .filter((tool) => allowedToolNames.includes(tool.name))
    .map(toOpenAiTool);

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: agentSystemPrompt(role, machineId),
    },
    {
      role: 'user',
      content:
        `Round ${round}: gather only your allowed context, then call propose_window exactly once for ${machineId}. ` +
        `Use ISO 8601 windows in January 2025. Prior negotiation context:\n${priorContext || 'None yet.'}`,
    },
  ];

  for (let step = 1; step <= MAX_AGENT_STEPS; step += 1) {
    const forcedToolName = step >= 4 ? 'propose_window' : undefined;
    const activeTools = forcedToolName
      ? tools.filter((tool) => tool.function.name === forcedToolName)
      : tools;
    const assistantMessage = await callGroqWithRetry(apiKey, messages, activeTools, forcedToolName);
    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls ?? [];
    if (toolCalls.length === 0) {
      messages.push({
        role: 'user',
        content: `You must call one of your allowed tools. If ready, call propose_window for ${machineId}.`,
      });
      continue;
    }

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      if (!allowedToolNames.includes(toolName)) {
        throw new Error(`${role} attempted disallowed tool: ${toolName}`);
      }

      const args = ensureProposalRole(role, toolName, parseToolArguments(toolCall.function.arguments));
      const payload = await callMcpTool(client, role, toolName, args);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(payload),
      });

      if (toolName === 'propose_window') {
        return payload;
      }
    }
  }

  throw new Error(`${role} did not call propose_window within ${MAX_AGENT_STEPS} Groq steps.`);
}

async function connectMcpServer(): Promise<{ client: Client; transport: StdioClientTransport }> {
  const distIndex = resolve(process.cwd(), 'dist/index.js');
  if (!existsSync(distIndex)) {
    throw new Error('dist/index.js not found. Run npm run build before npm run agent-demo.');
  }

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [distIndex],
    cwd: process.cwd(),
    stderr: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'development',
    } as Record<string, string>,
  });

  transport.stderr?.on('data', (chunk) => {
    const text = String(chunk).trim();
    if (text) {
      console.error(`[MCP SERVER] ${text}`);
    }
  });

  const client = new Client(
    {
      name: 'downtime-arbiter-agent-orchestrator',
      version: '1.0.0',
    },
    {
      capabilities: {},
    },
  );

  await client.connect(transport);
  return { client, transport };
}

async function main() {
  const apiKey = requireGroqKey();
  console.log(`Downtime Arbiter agent demo starting for ${machineId}`);
  console.log(`Groq model: ${GROQ_MODEL}`);
  console.log('MCP transport: stdio -> node dist/index.js');

  const { client, transport } = await connectMcpServer();

  try {
    const listedTools = await client.listTools();
    const tools = listedTools.tools as McpTool[];
    console.log(`Available MCP tools: ${tools.map((tool) => tool.name).join(', ')}`);

    const transcript: string[] = [];

    for (const round of [1, 2] as const) {
      const maintenanceProposal = await runAgentProposal(
        client,
        apiKey,
        'Maintenance',
        round,
        tools,
        transcript.join('\n'),
      );
      transcript.push(`Maintenance round ${round}: ${JSON.stringify(maintenanceProposal)}`);

      const productionProposal = await runAgentProposal(
        client,
        apiKey,
        'Production',
        round,
        tools,
        transcript.join('\n'),
      );
      transcript.push(`Production round ${round}: ${JSON.stringify(productionProposal)}`);
    }

    const resolution = await callMcpTool(client, 'Arbiter', 'resolve_negotiation', {
      machine_id: machineId,
      caller_role: 'Arbiter',
    });

    console.log('\n[DEMO] FINAL RESOLUTION');
    console.log(JSON.stringify(resolution, null, 2));

    const roundThreeProbe = await callMcpTool(client, 'Manual Round-3 Probe', 'propose_window', {
      role: 'Maintenance',
      machine_id: machineId,
      window_start: '2025-01-24T08:00:00Z',
      window_end: '2025-01-24T12:00:00Z',
      duration_hours: 4,
      rationale: 'Manual probe to confirm closed negotiation or round cap rejects extra proposals.',
      estimated_cost: 75,
    });

    console.log('\n[DEMO] ROUND-3 / CLOSED-NEGOTIATION PROBE');
    console.log(JSON.stringify(roundThreeProbe, null, 2));
  } finally {
    await transport.close();
  }
}

main().catch((error: unknown) => {
  console.error('\n[DEMO] FAILED');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
