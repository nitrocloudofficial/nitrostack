import OpenAI from 'openai';
import { FINOPS_SYSTEM, GUARDIAN_SYSTEM, SUMMARY_SYSTEM } from './prompts.js';
import { TOOLS } from './tools.js';
import { executeTool } from './executor.js';
import { getActionLog } from '../modules/k8s/audit.js';

// ── terminal colours ────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  bg_green: '\x1b[42m',
  bg_red: '\x1b[41m',
  bg_yellow: '\x1b[43m',
  bg_blue: '\x1b[44m',
};

function banner(color: string, icon: string, label: string) {
  console.log(`\n${color}${C.bold} ${icon}  ${label} ${C.reset}`);
  console.log(`${C.dim}${'─'.repeat(60)}${C.reset}`);
}

function log(prefix: string, color: string, msg: string) {
  msg.split('\n').forEach((line) => {
    console.log(`${color}${C.bold}[${prefix}]${C.reset} ${line}`);
  });
}

// ── Grok client (via OpenAI SDK) ────────────────────────
const apiKey = process.env.GROK_API_KEY;
if (!apiKey) {
  console.error(`${C.red}${C.bold}Error:${C.reset} GROK_API_KEY env variable is not set.`);
  console.error(`  Get a key at: https://console.x.ai`);
  console.error(`  Then: export GROK_API_KEY="your-key"`);
  process.exit(1);
}

const openai = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });

// Model
const MODEL = 'grok-2-latest';

// ── types ───────────────────────────────────────────
type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

// ── agent loop ──────────────────────────────────────
async function runAgent(
  systemPrompt: string,
  agentName: string,
  color: string,
  userPrompt: string,
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  let finalText = '';
  let iterations = 0;
  const MAX_ITERATIONS = 15;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    });

    const choice = response.choices[0];
    const message = choice.message;

    // Add assistant message to history
    messages.push(message as ChatMessage);

    // Handle text content
    if (message.content && message.content.trim()) {
      log(agentName, color, message.content);
      finalText += message.content + '\n';
    }

    // If no tool calls, agent is done
    if (!message.tool_calls || message.tool_calls.length === 0) {
      break;
    }

    // Execute each tool call
    for (const toolCall of message.tool_calls) {
      const fnName = toolCall.function.name;
      let fnArgs: Record<string, unknown> = {};

      try {
        fnArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch {
        fnArgs = {};
      }

      console.log(
        `${C.dim}  ↳ calling ${C.cyan}${fnName}${C.reset}${C.dim}(${JSON.stringify(fnArgs).slice(0, 80)})${C.reset}`,
      );

      try {
        const result = await executeTool(fnName, fnArgs);
        const resultStr = JSON.stringify(result);

        // Highlight VETO / EXECUTED
        if (resultStr.includes('VETO') || resultStr.includes('REJECTED')) {
          console.log(`${C.red}${C.bold}  ⛔ SAFETY GATE → REJECTED${C.reset}`);
        } else if (resultStr.includes('"ok":true') || resultStr.includes('"ok": true')) {
          console.log(`${C.green}${C.bold}  ✅ EXECUTED${C.reset}`);
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: resultStr,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.log(`${C.red}  ✗ tool error: ${errMsg}${C.reset}`);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: errMsg }),
        });
      }
    }
  }

  return finalText;
}

// ── main orchestration ──────────────────────────────
async function main() {
  console.log(`\n${C.bg_blue}${C.bold} ⎈  HELMSMAN — Autonomous Kubernetes Remediation ${C.reset}`);
  console.log(`${C.dim}   Multi-agent cost optimization with availability protection${C.reset}`);
  console.log(`${C.dim}   Powered by ${MODEL} on Grok${C.reset}\n`);

  // ── Phase 1: FinOps Agent ─────────────────────────
  banner(C.bg_yellow, '💰', 'PHASE 1 — FinOps Agent: Cost Analysis');
  await runAgent(
    FINOPS_SYSTEM,
    'FinOps',
    C.yellow,
    `Analyse the current cluster state in the "shop" namespace.
Identify any over-provisioned deployments and propose cost-saving scale-down actions.
For each proposal, check disruption safety first, then execute the scale if safe.
Provide cost savings estimates in INR/hr.`,
  );

  // ── Phase 2: Guardian Review ──────────────────────
  const actions = getActionLog();

  if (actions.length > 0) {
    banner(C.bg_green, '🛡️', 'PHASE 2 — Availability Guardian: Post-Action Review');
    await runAgent(
      GUARDIAN_SYSTEM,
      'Guardian',
      C.green,
      `Review the current state of the "shop" namespace after the FinOps agent has acted.
Check pod health and disruption budgets for all deployments.
Report any concerns about availability, unhealthy pods, or unsafe states.

Actions taken so far:
${JSON.stringify(actions, null, 2)}`,
    );
  }

  // ── Phase 3: Change Record ────────────────────────
  banner(C.bg_blue, '📝', 'PHASE 3 — Change Record');

  const allActions = getActionLog();
  if (allActions.length === 0) {
    log('Summary', C.blue, 'No actions were taken this cycle.');
  } else {
    await runAgent(
      SUMMARY_SYSTEM,
      'Summary',
      C.blue,
      `Generate a change record from this remediation cycle.

Audit log:
${JSON.stringify(allActions, null, 2)}

Include executed changes, blocked changes with veto reasons, and net cost impact.`,
    );
  }

  // ── Done ──────────────────────────────────────────
  console.log(`\n${C.bg_blue}${C.bold} ⎈  CYCLE COMPLETE ${C.reset}`);
  console.log(
    `${C.dim}   Total actions: ${allActions.length} ` +
      `(${allActions.filter((a) => a.status === 'EXECUTED').length} executed, ` +
      `${allActions.filter((a) => a.status === 'REJECTED').length} rejected)${C.reset}`,
  );
  console.log(`${C.dim}   Run 'kubectl get pods -n shop' to see the live state.${C.reset}\n`);
}

main().catch((err) => {
  console.error(`${C.red}${C.bold}Fatal:${C.reset}`, err);
  process.exit(1);
});