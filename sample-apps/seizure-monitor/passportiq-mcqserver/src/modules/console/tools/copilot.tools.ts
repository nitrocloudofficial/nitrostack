/**
 * copilot_chat — the conversational surface, exposed as a first-class MCP tool.
 *
 * The browser chat panel and any MCP client (NitroStudio, Claude, an agent)
 * hit the SAME service, so "what should I review first" gives the same answer
 * with the same tool-call provenance whether it was typed into the console or
 * into an LLM client. Not @Cache'd: a message can trigger investigations and
 * decisions — replaying a cached reply while doing nothing would be the worst
 * kind of lie.
 */
import { Injectable, ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';
import { parse } from '../../verification/tools/document.tools.js';
import { CopilotChatService } from '../services/copilot-chat.service.js';

const CopilotChatInputSchema = z.object({
  message: z
    .string()
    .min(1)
    .max(2000)
    .describe(
      'Plain-language instruction, e.g. "what should I review first", ' +
        '"investigate PIQ-2026-2004", "approve PIQ-2026-2003 note documents verified".'
    ),
  sessionId: z
    .string()
    .min(1)
    .max(80)
    .optional()
    .describe('Conversation id. Reuse it to keep context; omit for a one-shot ask.'),
  officer: z
    .string()
    .min(1)
    .max(80)
    .optional()
    .describe('Name of the human officer speaking, stamped onto the transcript.'),
});

const ChatActionSchema = z.object({
  tool: z.string(),
  ok: z.boolean(),
  summary: z.string(),
});

const ChatTurnSchema = z.object({
  id: z.string(),
  role: z.enum(['officer', 'copilot']),
  text: z.string(),
  at: z.string(),
  officer: z.string().optional(),
  actions: z.array(ChatActionSchema).optional(),
  suggestions: z.array(z.string()).optional(),
  applicationId: z.string().optional(),
  mode: z.enum(['llm', 'deterministic']).optional(),
});

const CopilotChatOutputSchema = z.object({
  sessionId: z.string(),
  turn: ChatTurnSchema,
  latestTurnId: z.string(),
});

@Injectable({ deps: [CopilotChatService] })
export class CopilotTools {
  constructor(private readonly copilot: CopilotChatService) {}

  @Tool({
    name: 'copilot_chat',
    title: 'Copilot: converse with PassportIQ',
    description:
      'Talk to PassportIQ in plain language. The copilot routes the instruction to the real ' +
      'MCP tools (triage, investigation, pipeline runs, risk explanations, guarded officer ' +
      'decisions), executes them, and answers with every tool call it made listed for audit. ' +
      'It recommends but never decides — "approve X" goes through officer_decide behind the ' +
      'same completeness guard as every other caller.',
    inputSchema: CopilotChatInputSchema,
    outputSchema: CopilotChatOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  })
  async copilotChat(rawInput: unknown): Promise<z.infer<typeof CopilotChatOutputSchema>> {
    const input = parse(CopilotChatInputSchema, rawInput, 'copilot_chat');
    const sessionId = input.sessionId ?? `mcp-${Date.now().toString(36)}`;
    return this.copilot.handle(sessionId, input.message, input.officer);
  }
}
