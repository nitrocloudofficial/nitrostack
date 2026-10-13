import { ToolDecorator as Tool, PromptDecorator as Prompt, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { UserModeService } from '../../services/user-mode.service.js';

@Injectable({ deps: [UserModeService] })
export class SessionTools {
  constructor(private readonly userMode: UserModeService) {}

  // ------------------------------------------------------------------
  // Prompt — the MCP-native "conversation starter". A compliant client
  // can surface this (e.g. as a suggested/slash action) at the start of a
  // new conversation. It doesn't call any tool itself — it returns an
  // instruction telling the assistant to ask the rider/driver question
  // and then call set_user_mode with the answer, matching the "How can I
  // help you today? Customer / Driver" requirement.
  // ------------------------------------------------------------------
  @Prompt({
    name: 'start_conversation',
    title: 'Start with RIVA',
    description:
      'Use at the start of a new conversation to greet the user and ask whether they need the Rider assistant or the Driver assistant before doing anything else.',
  })
  async startConversation(_args: Record<string, unknown>, ctx: ExecutionContext) {
    ctx.logger.info('start_conversation prompt invoked');

    return [
      {
        role: 'system' as const,
        content:
          'Before calling any other RIVA tool, greet the user and ask: "How can I help you today — are you looking for a ride (Customer), or are you a driver (Driver)?" ' +
          'Wait for their answer, then call the set_user_mode tool with mode: "rider" or mode: "driver" accordingly. ' +
          'Only skip this question if the user\'s first message already makes their role unambiguous (e.g. they directly ask to find a ride, or directly describe a ride offer they received as a driver) — in that case, call set_user_mode with the implied mode instead of asking, then proceed.',
      },
    ];
  }

  // ------------------------------------------------------------------
  // Tool — the actual mode switch, called either after the user answers
  // the question above, or immediately when their first message already
  // makes the mode unambiguous.
  // ------------------------------------------------------------------
  @Tool({
    name: 'set_user_mode',
    description:
      'Switch the conversation between Rider Mode and Driver Mode. This should normally be the FIRST tool called in a new conversation — ask the user "Customer or Driver?" before calling it, unless their first message already makes this obvious. Rider Mode surfaces ride discovery/comparison/travel-planning tools; Driver Mode surfaces trip-acceptance, demand, and earnings tools.',
    inputSchema: z.object({
      mode: z.enum(['rider', 'driver']).describe('The mode to switch to'),
    }),
    examples: {
      request: { mode: 'driver' },
    },
  })
  async setUserMode(input: { mode: 'rider' | 'driver' }, ctx: ExecutionContext) {
    const mode = this.userMode.set(input.mode);
    ctx.logger.info('User mode switched', { mode });

    return {
      mode,
      message:
        mode === 'driver'
          ? 'Switched to Driver Mode. You can now ask about trip acceptance, destination demand, next-zone suggestions, nearby ride requests, and earnings summaries.'
          : 'Switched to Rider Mode. You can now search, compare, and plan rides, check nearby drivers, and use travel planning, pooling, and safety features.',
    };
  }
}
