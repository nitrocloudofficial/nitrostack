var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { PromptDecorator as Prompt, Injectable } from '@nitrostack/core';
import { SubscriptionsService } from './subscriptions.service.js';
let SubscriptionsPrompts = class SubscriptionsPrompts {
    subscriptionsService;
    constructor(subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }
    async getAuditStrategistPrompt(args, ctx) {
        const subscriptions = this.subscriptionsService.getTrackedSubscriptions();
        const metrics = this.subscriptionsService.calculateMetrics();
        ctx.logger.info('Generating audit strategist prompt', {
            totalSubscriptions: subscriptions.length,
        });
        return [
            {
                role: 'user',
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
    async getProactiveNotifierPrompt(args, ctx) {
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
                role: 'user',
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
};
__decorate([
    Prompt({
        name: 'audit_strategist',
        description: 'Frame the agent as a financial advisor reviewing tracked subscriptions for waste and avoidable recurring spend.',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsPrompts.prototype, "getAuditStrategistPrompt", null);
__decorate([
    Prompt({
        name: 'proactive_notifier',
        description: 'Format subscription renewal alerts. Use a friendly reminder for high engagement and include a cancellation playbook for low engagement.',
        arguments: [
            {
                name: 'service_name',
                description: 'Service to format an alert for. If omitted, use imminent no-engagement alerts.',
                required: false,
            },
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsPrompts.prototype, "getProactiveNotifierPrompt", null);
SubscriptionsPrompts = __decorate([
    Injectable({ deps: [SubscriptionsService] }),
    __metadata("design:paramtypes", [SubscriptionsService])
], SubscriptionsPrompts);
export { SubscriptionsPrompts };
//# sourceMappingURL=subscriptions.prompts.js.map