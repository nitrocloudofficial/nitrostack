import { Injectable } from '@nitrostack/core';
import { StoreService } from '../store/store.service.js';
import { Commitment, NudgeTone } from '../../common/types.js';
import { formatDate, todayISO } from '../../common/dates.js';
import { SlackProvider } from '../../providers/slack.js';
import { EmailProvider } from '../../providers/email.js';

export interface NudgeResult {
  sent: boolean;
  channel: string;
  recipient: string;
  commitment_id: string;
  tone: NudgeTone;
  message_body: string;
  sent_at: string;
  delivery?: 'real' | 'mock' | 'failed';
}

@Injectable({ deps: [StoreService] })
export class NudgeService {
  private slackProvider = new SlackProvider();
  private emailProvider = new EmailProvider();

  constructor(private store: StoreService) {}

  buildMessage(commitment: Commitment, tone: NudgeTone): string {
    const phrase = commitment.confidence_phrase || commitment.text_raw || commitment.what;
    const due = formatDate(commitment.due_date);
    const firstNudge = commitment.nudge_log.find((n) => n.type === 'nudge_1');

    switch (tone) {
      case 'urgent':
        return `[urgent] Following up on "${phrase}" (due ${due}). We have now sent two reminders with no update. Please confirm status today so we can unblock you if needed.`;
      case 'specific': {
        const first = firstNudge ? ` This was also flagged on ${formatDate(firstNudge.sent_at)}.` : '';
        return `Quick follow-up on "${phrase}" \u2014 due ${due}.${first} Can you confirm whether this is done, or if there's a blocker worth surfacing?`;
      }
      case 'gentle':
      default:
        return `Heads up \u2014 you committed to "${phrase}" by ${due}. No stress, just checking in. Anything you need a hand with?`;
    }
  }

  async send(commitment: Commitment, tone: NudgeTone, channel?: string, messageBody?: string): Promise<NudgeResult> {
    const message_body = messageBody ?? this.buildMessage(commitment, tone);
    const channelResolved = channel ?? (commitment.owner.slack_id ? 'slack' : 'email');
    const recipient =
      channelResolved === 'email'
        ? (commitment.owner.email ?? commitment.owner.name)
        : (commitment.owner.slack_id ?? commitment.owner.name);

    const virtualToday = this.store.getVirtualToday();
    const delivery = await this.deliver(channelResolved, recipient, message_body, commitment);

    this.store.appendNudge(commitment.commitment_id, {
      type: tone === 'gentle' ? 'nudge_1' : 'nudge_2',
      sent_at: delivery === 'real' ? todayISO() : virtualToday,
      channel: channelResolved,
      tone,
      message_body,
    });

    return {
      sent: delivery !== 'failed',
      channel: channelResolved,
      recipient,
      commitment_id: commitment.commitment_id,
      tone,
      message_body,
      sent_at: delivery === 'real' ? todayISO() : virtualToday,
      delivery,
    };
  }

  private async deliver(
    channel: string,
    recipient: string,
    text: string,
    commitment: Commitment
  ): Promise<'real' | 'mock' | 'failed'> {
    if (channel === 'slack') {
      if (this.slackProvider.enabled) {
        try {
          await this.slackProvider.postDm(recipient, text);
          return 'real';
        } catch (err) {
          console.error(`[NudgeService] Slack DM failed for ${recipient}: ${(err as Error).message}`);
          return 'failed';
        }
      }
      return 'mock';
    }
    if (channel === 'email') {
      if (this.emailProvider.canSend) {
        try {
          await this.emailProvider.send({
            to: recipient,
            subject: `Follow-up: ${commitment.what}`,
            text,
          });
          return 'real';
        } catch (err) {
          console.error(`[NudgeService] Email failed for ${recipient}: ${(err as Error).message}`);
          return 'failed';
        }
      }
      return 'mock';
    }
    return 'mock';
  }
}
