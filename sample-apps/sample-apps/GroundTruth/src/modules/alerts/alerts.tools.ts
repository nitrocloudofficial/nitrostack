import { ExecutionContext, z } from '@nitrostack/core';
import { ValidatedTool as Tool } from '../../lib/validated-tool.js';
import { store, today } from '../../store/store.js';
import { deliverToSlack } from './slack.service.js';
import type { Alert } from '../../store/types.js';

export class AlertsTools {
  @Tool({
    name: 'send_manager_alert',
    description:
      "Raise an alert on a manager's dashboard about one employee. " +
      'Call this ONLY when you have reasoned that something genuinely needs a human to look at it — ' +
      'a significant gap between claimed and actual work, a blocker that has persisted across days, ' +
      'or a clear drop in how someone is coping. Do not alert on a low match score alone: ' +
      'legitimate work (meetings, design, pairing, untracked repos) often leaves no commits. ' +
      'The reason you supply is what the manager reads, so make it specific and evidence-based.',
    inputSchema: z.object({
      employeeId: z
        .string()
        .describe('Employee id, full name, or GitHub username'),
      reason: z
        .string()
        .min(10)
        .describe(
          'Specific, evidence-based explanation of what you found and why it needs attention',
        ),
      severity: z
        .enum(['low', 'medium', 'high'])
        .describe(
          'low: worth noting in the digest. medium: should be raised at the next standup. high: needs attention today.',
        ),
      date: z
        .string()
        .optional()
        .describe('Date the alert relates to, YYYY-MM-DD. Defaults to today.'),
    }),
  })
  async sendManagerAlert(
    input: {
      employeeId: string;
      reason: string;
      severity: 'low' | 'medium' | 'high';
      date?: string;
    },
    ctx: ExecutionContext,
  ) {
    const employee = store.resolveEmployee(input.employeeId);
    if (!employee) {
      throw new Error(
        `No employee matches "${input.employeeId}". Read the team://employees resource for valid ids.`,
      );
    }

    const date = input.date ?? today();

    const alert: Alert = {
      id: `alert-${Date.now()}`,
      employeeId: employee.id,
      teamId: employee.teamId,
      date,
      reason: input.reason,
      severity: input.severity,
      createdAt: new Date().toISOString(),
      resolved: false,
    };

    store.addAlert(alert);

    ctx.logger.warn('Manager alert raised', {
      employee: employee.name,
      severity: input.severity,
      reason: input.reason,
    });

    // Courtesy copy to Slack when a webhook is configured. The alert is already
    // recorded, so a delivery failure is reported, not thrown — the escalation
    // succeeded regardless of whether the notification did.
    const slack = await deliverToSlack({
      employeeName: employee.name,
      employeeRole: employee.role,
      teamId: employee.teamId,
      date,
      reason: input.reason,
      severity: input.severity,
    });

    if (slack.attempted && !slack.delivered) {
      ctx.logger.warn('Slack delivery failed', { reason: slack.reason });
    }

    return {
      raised: true,
      alertId: alert.id,
      employee: { id: employee.id, name: employee.name },
      teamId: employee.teamId,
      date,
      severity: input.severity,
      reason: input.reason,
      slack,
      note: `This alert will appear at the top of the ${employee.teamId} digest until it is resolved.`,
    };
  }

  @Tool({
    name: 'resolve_manager_alert',
    description:
      'Mark an alert as handled so it stops appearing in the digest. ' +
      'Use after a manager has acted on it, or when follow-up evidence clears the concern.',
    inputSchema: z.object({
      alertId: z.string().describe('The alert id returned by send_manager_alert'),
    }),
  })
  async resolveManagerAlert(input: { alertId: string }, ctx: ExecutionContext) {
    const alert = store.resolveAlert(input.alertId);
    if (!alert) {
      throw new Error(
        `No alert with id "${input.alertId}". Read alerts://team/{teamId} to list open alerts.`,
      );
    }

    ctx.logger.info('Alert resolved', { alertId: alert.id });

    return { resolved: true, alertId: alert.id, employeeId: alert.employeeId };
  }
}
