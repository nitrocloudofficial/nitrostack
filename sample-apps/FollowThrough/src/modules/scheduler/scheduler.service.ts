import { Injectable, OnModuleInit } from '@nitrostack/core';
import { StoreService } from '../store/store.service.js';
import { EvidenceService } from '../evidence/evidence.service.js';
import { NudgeService } from '../nudge/nudge.service.js';
import { LinearService } from '../linear/linear.service.js';
import { Commitment } from '../../common/types.js';
import { addDays, formatDate } from '../../common/dates.js';
import { DONE_THRESHOLD } from '../../common/matching.js';

export interface SchedulerAction {
  commitment_id: string;
  owner: string;
  what: string;
  action: 'done_evidence' | 'done_ticket' | 'nudge_1' | 'nudge_2' | 'escalated' | 'pending';
  detail: string;
}

export interface TickReport {
  today: string;
  checked: number;
  actions: SchedulerAction[];
}

@Injectable({ deps: [StoreService, EvidenceService, NudgeService, LinearService] })
export class SchedulerService implements OnModuleInit {
  private timer?: NodeJS.Timeout;

  constructor(
    private store: StoreService,
    private evidence: EvidenceService,
    private nudge: NudgeService,
    private linear: LinearService
  ) {}

  onModuleInit(): void {
    const intervalMs = Number(process.env.SCHEDULER_INTERVAL_MS ?? 60 * 60 * 1000);
    if (intervalMs > 0 && Number.isFinite(intervalMs)) {
      const timer = setInterval(() => {
        this.tick().catch((err) => {
          console.error('scheduler tick failed', err);
        });
      }, intervalMs);
      timer.unref?.();
      this.timer = timer;
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async tick(simulatedToday?: string): Promise<TickReport> {
    const today = simulatedToday ?? this.store.getVirtualToday();
    const due = this.store.query({
      status: ['open', 'nudged_1', 'nudged_2'],
      due_before: today,
    });
    const actions: SchedulerAction[] = [];

    for (const c of due) {
      if (c.confidence_level === 'aspirational' || !c.due_date) {
        continue;
      }

      const fulfillment = await this.evidence.checkFulfilled(c);
      for (const entry of fulfillment.evidence) {
        this.store.appendEvidence(c.commitment_id, entry);
      }

      if (fulfillment.fulfilled) {
        this.store.setStatus(c.commitment_id, 'done');
        const best = fulfillment.evidence.find((e) => e.matched_score >= DONE_THRESHOLD);
        actions.push({
          commitment_id: c.commitment_id,
          owner: c.owner.name,
          what: c.what,
          action: 'done_evidence',
          detail: best
            ? `${best.source} evidence "${best.summary}" (score ${best.matched_score})`
            : 'Evidence threshold crossed',
        });
        continue;
      }

      if (c.linked_ticket_id) {
        const status = await this.linear.getStatus(c.linked_ticket_id);
        if (status === 'Done') {
          this.store.setStatus(c.commitment_id, 'done');
          actions.push({
            commitment_id: c.commitment_id,
            owner: c.owner.name,
            what: c.what,
            action: 'done_ticket',
            detail: `${c.linked_ticket_id} marked Done in Linear`,
          });
          continue;
        }
      }

      const step = await this.advanceState(c, today);
      if (step) {
        actions.push({
          commitment_id: c.commitment_id,
          owner: c.owner.name,
          what: c.what,
          action: step.action,
          detail: step.detail,
        });
      }
    }

    return { today, checked: due.length, actions };
  }

  private async advanceState(
    c: Commitment,
    today: string
  ): Promise<{ action: 'nudge_1' | 'nudge_2' | 'escalated'; detail: string } | null> {
    const hedged = c.confidence_level === 'hedged';
    const due = c.due_date;

    if (c.status === 'open') {
      if (today >= addDays(due, hedged ? 2 : 0)) {
        const result = await this.nudge.send(c, 'gentle');
        this.store.setStatus(c.commitment_id, 'nudged_1');
        return { action: 'nudge_1', detail: result.message_body };
      }
    } else if (c.status === 'nudged_1') {
      if (today >= addDays(due, hedged ? 5 : 3)) {
        const result = await this.nudge.send(c, hedged ? 'gentle' : 'specific');
        this.store.setStatus(c.commitment_id, 'nudged_2');
        return { action: 'nudge_2', detail: result.message_body };
      }
    } else if (c.status === 'nudged_2') {
      if (today >= addDays(due, hedged ? 10 : 6)) {
        const managerEmail = c.owner.manager_email ?? '';
        const comment = this.buildEscalationComment(c, today);
        if (c.linked_ticket_id) {
          await this.linear.escalate(c.linked_ticket_id, managerEmail, comment);
        }
        this.store.setEscalation(c.commitment_id, {
          manager: managerEmail,
          escalated_at: today,
          reason: comment,
        });
        this.store.setStatus(c.commitment_id, 'escalated');
        return { action: 'escalated', detail: comment };
      }
    }
    return null;
  }

  private buildEscalationComment(c: Commitment, today: string): string {
    const phrase = c.confidence_phrase || c.text_raw || c.what;
    const due = formatDate(c.due_date);
    const nudgeDates = c.nudge_log.map((n) => formatDate(n.sent_at)).join(', ');
    const reminders = nudgeDates
      ? `Two reminders were sent (${nudgeDates})`
      : `Reminders were sent`;
    return `${c.owner.name} committed to "${phrase}" (due ${due}). ${reminders} with no response or evidence of progress in Slack/email as of ${formatDate(today)}. Flagging in case there's a blocker worth unblocking \u2014 not asking you to chase them down, just making sure nothing's stuck.`;
  }
}
