import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { NudgeService } from './nudge.service.js';
import { StoreService } from '../store/store.service.js';

@Injectable({ deps: [NudgeService, StoreService] })
export class NudgeTools {
  constructor(
    private nudge: NudgeService,
    private store: StoreService
  ) {}

  @Tool({
    name: 'send_nudge',
    description:
      'Sends a contextual reminder to the commitment owner via Slack or email, referencing the original commitment language and deadline. Tone calibration: gentle first, specific second, urgent only on hard blockers.',
    inputSchema: z.object({
      channel: z.enum(['slack', 'email']),
      recipient: z.string().describe('Slack ID or email of the owner'),
      commitment_id: z.string(),
      tone: z.enum(['gentle', 'specific', 'urgent']),
      message_body: z.string().describe('Message text; must quote the original commitment phrase'),
    }),
    examples: {
      request: {
        channel: 'slack',
        recipient: 'U01MARCUS',
        commitment_id: 'cmt_8f2a1c',
        tone: 'gentle',
        message_body: 'Heads up \u2014 you committed to "publish the pricing API migration plan" by Aug 1. Anything you need a hand with?',
      },
    },
  })
  async sendNudge(
    input: { channel: 'slack' | 'email'; recipient: string; commitment_id: string; tone: 'gentle' | 'specific' | 'urgent'; message_body: string },
    ctx: ExecutionContext
  ) {
    const commitment = this.store.get(input.commitment_id);
    if (!commitment) {
      throw new Error(`Commitment ${input.commitment_id} not found`);
    }
    const result = await this.nudge.send(commitment, input.tone, input.channel, input.message_body);
    ctx.logger.info('Nudge sent', { commitment_id: input.commitment_id, tone: input.tone });
    return result;
  }
}
