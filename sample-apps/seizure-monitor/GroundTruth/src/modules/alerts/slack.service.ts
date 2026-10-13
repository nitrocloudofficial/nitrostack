/**
 * Optional Slack delivery for manager alerts.
 *
 * Entirely opt-in: with no SLACK_WEBHOOK_URL set, nothing is ever sent and
 * send_manager_alert behaves exactly as before. That default matters — a tool
 * that quietly posts to a team channel the moment it is deployed would be a
 * nasty surprise.
 *
 * Delivery failure never fails the alert. The alert is already recorded and
 * visible in the digest; Slack is a courtesy copy, and losing it should not make
 * the agent think its escalation failed.
 */

import type { AlertSeverity } from '../../store/types.js';

export interface SlackDeliveryResult {
  attempted: boolean;
  delivered: boolean;
  reason?: string;
}

/** Slack accepts a webhook only over HTTPS on its own domains. */
function isPlausibleWebhook(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    // Allow plain HTTP only for localhost, which is how the test drives a mock.
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

const SEVERITY_PREFIX: Record<AlertSeverity, string> = {
  high: 'Needs attention today',
  medium: 'Raise at standup',
  low: 'Worth noting',
};

export interface AlertMessage {
  employeeName: string;
  employeeRole: string;
  teamId: string;
  date: string;
  reason: string;
  severity: AlertSeverity;
}

/**
 * Posts an alert to Slack if a webhook is configured.
 * Resolves with a result rather than throwing, whatever happens.
 */
export async function deliverToSlack(
  alert: AlertMessage,
): Promise<SlackDeliveryResult> {
  const webhook = process.env.SLACK_WEBHOOK_URL?.trim();

  if (!webhook) {
    return { attempted: false, delivered: false, reason: 'SLACK_WEBHOOK_URL not set' };
  }
  if (!isPlausibleWebhook(webhook)) {
    return {
      attempted: false,
      delivered: false,
      reason: 'SLACK_WEBHOOK_URL is not a valid https URL',
    };
  }

  // Written for someone glancing at a phone: the severity and the person first,
  // then the specific evidence, because that is what decides whether they act now.
  const body = {
    text: `${SEVERITY_PREFIX[alert.severity]} — ${alert.employeeName}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*${SEVERITY_PREFIX[alert.severity]}* · ${alert.employeeName} ` +
            `(${alert.employeeRole})\n${alert.reason}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${alert.teamId} · ${alert.date} · raised by GroundTruth`,
          },
        ],
      },
    ],
  };

  // Don't let a hanging webhook stall the tool call.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        attempted: true,
        delivered: false,
        reason: `Slack responded ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`,
      };
    }

    return { attempted: true, delivered: true };
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Slack did not respond within 5s'
        : error instanceof Error
          ? error.message
          : String(error);
    return { attempted: true, delivered: false, reason: message };
  } finally {
    clearTimeout(timeout);
  }
}
