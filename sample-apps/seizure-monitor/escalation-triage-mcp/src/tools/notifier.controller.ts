import { ControllerDecorator as Controller, ToolDecorator as Tool, z, type ExecutionContext } from '@nitrostack/core';
import {
  findOrCreateCustomer,
  draftNotification,
  approveAndSendNotification,
  getPendingNotifications,
  getBugsForCustomerName,
  markBugFixed,
} from '../db.js';

/**
 * AGENT: Notifier / Loop-Closer
 * - Internal alerts fire immediately (no approval needed).
 * - Customer-facing messages (assignment + resolution) are DRAFTED here but
 *   only marked "sent" once a human calls approve_and_send — this is what
 *   backs your approval-card UI.
 * - watch_bug_status / mark_bug_fixed is what triggers the resolution notice.
 */
@Controller('notify')
export class NotifierController {
  @Tool({
    name: 'notify_internal',
    description: 'Immediately notify the assigned owner internally (e.g. Slack DM/log). No approval required.',
    inputSchema: z.object({
      ownerName: z.string(),
      customerName: z.string(),
      label: z.string(),
      riskScore: z.number(),
    }),
  })
  async notifyInternal(
    input: { ownerName: string; customerName: string; label: string; riskScore: number },
    ctx: ExecutionContext
  ) {
    const message = `You've been assigned a ${input.label} issue for ${input.customerName}, risk ${input.riskScore}/10`;
    ctx.logger.info('Internal notification', { to: input.ownerName, message });
    return { sent: true, to: input.ownerName, message };
  }

  @Tool({
    name: 'draft_customer_message',
    description:
      'Draft a customer-facing message (assignment notice or resolution notice). Returns a draft that must be approved via approve_and_send before it counts as sent — this backs the approval-card UI.',
    inputSchema: z.object({
      customerName: z.string(),
      kind: z.enum(['assignment', 'resolution']),
      ownerName: z.string().optional(),
      label: z.string().optional(),
      bugTitle: z.string().optional(),
    }),
  })
  async draftCustomerMessage(
    input: {
      customerName: string;
      kind: 'assignment' | 'resolution';
      ownerName?: string;
      label?: string;
      bugTitle?: string;
    },
    ctx: ExecutionContext
  ) {
    const customer = await findOrCreateCustomer(input.customerName);
    let message: string;
    if (input.kind === 'assignment') {
      message = `Hi ${customer.name}, thanks for reaching out. Your ${input.label ?? 'issue'} has been assigned to ${input.ownerName ?? 'our team'} and they're on it.`;
    } else {
      message = `Hi ${customer.name}, good news — the issue${input.bugTitle ? ` ("${input.bugTitle}")` : ''} you reported has been resolved. Let us know if anything else comes up.`;
    }

    const notificationId = await draftNotification(customer.id, input.kind, message);
    ctx.logger.info('Drafted customer message pending approval', { notificationId });

    return { notificationId, draft: message, status: 'pending_approval' };
  }

  @Tool({
    name: 'approve_and_send',
    description: 'Human-approved: mark a drafted customer notification as sent. Call this only after a person clicks Approve.',
    inputSchema: z.object({ notificationId: z.number() }),
  })
  async approveAndSend(input: { notificationId: number }, ctx: ExecutionContext) {
    const result = await approveAndSendNotification(input.notificationId);
    ctx.logger.info('Notification approved and sent', { notificationId: input.notificationId });
    return { sent: true, notification: result };
  }

  @Tool({
    name: 'get_pending_approvals',
    description: 'List all drafted customer notifications waiting for human approval.',
    inputSchema: z.object({}),
  })
  async getPending(_input: Record<string, never>, _ctx: ExecutionContext) {
    return { pending: await getPendingNotifications() };
  }

  @Tool({
    name: 'mark_bug_fixed',
    description:
      'Mark a bug as fixed. Use this to simulate an engineer resolving the linked bug live during a demo; it is what should trigger a resolution notice draft.',
    inputSchema: z.object({ bugId: z.number() }),
  })
  async markFixed(input: { bugId: number }, ctx: ExecutionContext) {
    await markBugFixed(input.bugId);
    ctx.logger.info('Bug marked fixed', { bugId: input.bugId });
    return { bugId: input.bugId, status: 'fixed' };
  }

  @Tool({
    name: 'get_bugs_for_customer',
    description: 'Check bug status(es) for a customer, e.g. to answer "has the Globex bug shipped".',
    inputSchema: z.object({ customerName: z.string() }),
  })
  async getBugs(input: { customerName: string }, _ctx: ExecutionContext) {
    return { bugs: await getBugsForCustomerName(input.customerName) };
  }
}
