import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { Notification } from '../shared/notification.types.js';
import { queryLLM } from '../shared/llm.helper.js';

const NotificationSchema = z.object({
  id: z.string(),
  source: z.enum(['slack', 'jira', 'github', 'gmail', 'calendar', 'pagerduty']),
  sender: z.string(),
  title: z.string(),
  snippet: z.string(),
  timestamp: z.string(),
  link: z.string(),
  accountId: z.string(),
  accountEmail: z.string().nullable(),
  rawMetadata: z.record(z.any()).optional()
});

const ContextSchema = z.object({
  activeProject: z.string(),
  upcomingMeeting: z.any().nullable().optional(),
  keyCollaborators: z.array(z.string())
});

export class PrioritizerTools {
  @Tool({
    name: 'prioritizeNotifications',
    description: 'Prioritize a list of notifications based on the user\'s current context, assigning each a tier (urgent_now, normal, fyi_only) and a reason.',
    inputSchema: z.object({
      notifications: z.array(NotificationSchema).describe('The full list of notifications across all connected accounts'),
      context: ContextSchema.describe('The current user context (active project, upcoming meetings, key collaborators)')
    })
  })
  @Widget('priority-dashboard')
  async prioritizeNotifications(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Prioritizing notifications', { count: input.notifications.length });

    const notifications: Notification[] = input.notifications;
    const userContext = input.context;
    
    const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
    let hasKey = false;
    if (provider === 'gemini') {
      hasKey = !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('AQ.your-');
    } else {
      hasKey = !!(process.env.LLM_API_KEY || process.env.XAI_API_KEY || process.env.OPENAI_API_KEY);
    }

    if (!hasKey) {
      ctx.logger.info('LLM API credentials not found, using rule-based fallback prioritizer');
      return this.prioritizeWithRules(notifications, userContext);
    }

    try {
      const prompt = `
You are an AI notification triage assistant. Your task is to evaluate and categorize a list of employee notifications based on the user's current context.

User Context:
- Active Project: "${userContext.activeProject}"
- Key Collaborators: ${JSON.stringify(userContext.keyCollaborators)}
- Upcoming Meeting: ${JSON.stringify(userContext.upcomingMeeting || 'None')}

Evaluation Rules:
1. "urgent_now":
   - Meetings starting in less than 1 hour.
   - PagerDuty incidents.
   - GitHub Actions CI/CD build failures on the "main" branch.
   - Direct messages or mentions from key collaborators that directly reference the active project.
2. "normal":
   - Regular direct messages (DMs) or direct mentions.
   - Code review requests on GitHub.
   - Jira tickets assigned to the user or comments tagging them.
3. "fyi_only":
   - General channel updates with no direct mention.
   - Personal emails (e.g. Netflix, Amazon) or newsletters.
   - Completed build/CI updates on feature branches.

Input Notifications:
${JSON.stringify(notifications, null, 2)}

Return a JSON object containing a "prioritized" array where each item corresponds to an input notification. Format:
{
  "prioritized": [
    {
      "id": "notification_id",
      "tier": "urgent_now" | "normal" | "fyi_only",
      "reason": "Concise 1-sentence explanation matching the evaluation rules."
    }
  ]
}
`;

      const responseText = await queryLLM(
        "You are a notification prioritization API that must output raw, valid JSON matching the schema provided. Do not wrap in markdown or backticks.",
        prompt
      );

      const cleanedJson = responseText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);
      const mapping = new Map<string, { tier: 'urgent_now' | 'normal' | 'fyi_only'; reason: string }>();
      
      for (const item of parsed.prioritized || []) {
        mapping.set(item.id, { tier: item.tier, reason: item.reason });
      }

      const prioritized = notifications.map(notif => {
        const priority = mapping.get(notif.id) || {
          tier: 'normal' as const,
          reason: 'Standard work notification (Default fallback).'
        };
        return {
          ...notif,
          tier: priority.tier,
          reason: priority.reason
        };
      });

      return { prioritized };
    } catch (err) {
      ctx.logger.error('Gemini prioritization failed, falling back to rule-based prioritizing', { error: String(err) });
      return this.prioritizeWithRules(notifications, userContext);
    }
  }

  private prioritizeWithRules(notifications: Notification[], userContext: any) {
    const now = new Date();
    const prioritized = notifications.map(notif => {
      let tier: 'urgent_now' | 'normal' | 'fyi_only' = 'normal';
      let reason = 'Standard work notification.';

      const isPersonal = notif.accountId === 'gmail_personal';
      const notifTime = new Date(notif.timestamp).getTime();
      
      const textMatchesActiveProject = 
        notif.title.toLowerCase().includes(userContext.activeProject.toLowerCase()) ||
        notif.snippet.toLowerCase().includes(userContext.activeProject.toLowerCase());

      const isKeyCollaborator = userContext.keyCollaborators.some((collab: string) => 
        notif.sender.toLowerCase().includes(collab.toLowerCase())
      );

      if (isPersonal) {
        tier = 'fyi_only';
        reason = `Personal email received on ${notif.accountEmail || 'personal account'}.`;
      } else if (notif.source === 'calendar') {
        const timeDiffMins = Math.round((notifTime - now.getTime()) / (60 * 1000));
        if (timeDiffMins > 0 && timeDiffMins <= 60) {
          tier = 'urgent_now';
          reason = `Meeting "${notif.title}" starts in ${timeDiffMins} minutes.`;
        } else if (timeDiffMins > 0) {
          tier = 'normal';
          reason = `Upcoming meeting starts in ${Math.round(timeDiffMins / 60)} hours.`;
        } else {
          tier = 'fyi_only';
          reason = 'Meeting already passed or in progress.';
        }
      } else if (notif.source === 'pagerduty') {
        tier = 'urgent_now';
        reason = 'PagerDuty incident requires immediate action.';
      } else if (notif.source === 'github' && 
                 (notif.rawMetadata?.reason === 'ci_failure' || notif.rawMetadata?.reason === 'ci_activity') && 
                 notif.title.toLowerCase().includes('failed')) {
        tier = 'urgent_now';
        reason = 'Production build / CI failure on the main branch.';
      } else if (isKeyCollaborator && textMatchesActiveProject) {
        tier = 'urgent_now';
        reason = `High-priority discussion on active project "${userContext.activeProject}" with collaborator ${notif.sender}.`;
      }

      if (tier === 'normal') {
        if (notif.source === 'slack') {
          if (notif.rawMetadata?.type === 'im') {
            tier = 'normal';
            reason = `Direct message from ${notif.sender}.`;
          } else if (notif.rawMetadata?.type === 'mention') {
            tier = 'normal';
            reason = `Mentioned by ${notif.sender} in Slack.`;
          } else {
            tier = 'fyi_only';
            reason = 'Public channel update (no direct mention).';
          }
        } else if (notif.source === 'jira') {
          const dueDate = notif.rawMetadata?.dueDate;
          const isDueToday = dueDate && new Date(dueDate).toDateString() === new Date().toDateString();
          if (isDueToday) {
            tier = 'urgent_now';
            reason = `Assigned Jira task "${notif.title.replace('[Jira] ', '')}" is due today!`;
          } else {
            tier = 'normal';
            reason = `Jira updates for task assigned to you.`;
          }
        } else if (notif.source === 'github') {
          if (notif.rawMetadata?.reason === 'review_request') {
            tier = 'normal';
            reason = `Review requested by ${notif.sender} on PR.`;
          } else {
            tier = 'fyi_only';
            reason = 'GitHub repository activity.';
          }
        }
      }

      return {
        ...notif,
        tier,
        reason
      };
    });

    return { prioritized };
  }
}
