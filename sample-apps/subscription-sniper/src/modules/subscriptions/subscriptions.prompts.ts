import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';
import { SubscriptionsService } from './subscriptions.service.js';

@Injectable({ deps: [SubscriptionsService] })
export class SubscriptionsPrompts {
    constructor(private readonly subscriptionsService: SubscriptionsService) { }

    @Prompt({
        name: 'audit_strategist',
        description: 'Frame the agent as a financial advisor reviewing tracked subscriptions for waste and avoidable recurring spend.',
    })
    async getAuditStrategistPrompt(args: Record<string, never>, ctx: ExecutionContext) {
        const subscriptions = this.subscriptionsService.getTrackedSubscriptions();
        const metrics = this.subscriptionsService.calculateMetrics();

        ctx.logger.info('Generating audit strategist prompt', {
            totalSubscriptions: subscriptions.length,
        });

        return [
            {
                role: 'user' as const,
                content: `You are Subscription Sniper, a practical financial advisor focused on recurring-spend cleanup.

Review the tracked subscriptions resource and identify waste, price hikes, duplicated value, and renewal risk. Prioritize services with NO_ENGAGEMENT, imminent renewal dates, yearly commitments, and price increases.

Tracked subscriptions:
${JSON.stringify(subscriptions, null, 2)}

Current financial metrics:
${JSON.stringify(metrics, null, 2)}

Return a concise action plan with keep, cancel, negotiate, and watchlist recommendations.`,
            },
        ];
    }

    @Prompt({
        name: 'proactive_notifier',
        description: 'Format subscription renewal alerts. Use a friendly reminder for high engagement and include a cancellation playbook for low engagement.',
        arguments: [
            {
                name: 'service_name',
                description: 'Service to format an alert for. If omitted, use imminent no-engagement alerts.',
                required: false,
            },
        ],
    })
    async getProactiveNotifierPrompt(args: { service_name?: string }, ctx: ExecutionContext) {
        const subscriptions = args.service_name
            ? this.subscriptionsService.getTrackedSubscriptions().filter(subscription => {
                return subscription.service_name.toLowerCase() === args.service_name?.toLowerCase();
            })
            : this.subscriptionsService.getImminentNoEngagementAlerts();

        ctx.logger.info('Generating proactive notifier prompt', {
            requestedService: args.service_name,
            totalSubscriptions: subscriptions.length,
        });

        const playbooks = subscriptions
            .filter(subscription => subscription.engagement_status === 'NO_ENGAGEMENT')
            .map(subscription => ({
                service_name: subscription.service_name,
                cancellation_playbook: this.subscriptionsService.getCancellationPlaybook(subscription.service_name),
            }));

        return [
            {
                role: 'user' as const,
                content: `Format a proactive subscription renewal notification for the user.

Rules:
1. If engagement_status is HIGH_ENGAGEMENT, write a friendly renewal reminder.
2. If engagement_status is NO_ENGAGEMENT, clearly flag the likely waste and include the matching cancellation playbook.
3. If engagement_status is UNKNOWN, ask the user to confirm recent usage before cancelling.
4. Keep the tone calm, helpful, and action-oriented.

Subscriptions to notify on:
${JSON.stringify(subscriptions, null, 2)}

Cancellation playbooks for low-engagement services:
${JSON.stringify(playbooks, null, 2)}`,
            },
        ];
    }
}
