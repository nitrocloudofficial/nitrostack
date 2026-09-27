import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { SubscriptionsService } from './subscriptions.service.js';

@Injectable({ deps: [SubscriptionsService] })
export class SubscriptionsResources {
    constructor(private readonly subscriptionsService: SubscriptionsService) { }

    @Resource({
        uri: 'subscriptions://tracked',
        name: 'Tracked Subscriptions',
        description: 'All subscriptions extracted and stored during this server session.',
        mimeType: 'application/json',
        examples: {
            response: {
                subscriptions: [
                    {
                        service_name: 'Netflix',
                        amount: 649,
                        currency: 'INR',
                        billing_cycle: 'monthly',
                        next_renewal_date: '2026-07-19',
                        engagement_status: 'HIGH_ENGAGEMENT',
                    },
                ],
            },
        },
    })
    async getTrackedSubscriptions(uri: string, ctx: ExecutionContext) {
        const subscriptions = this.subscriptionsService.getTrackedSubscriptions();

        ctx.logger.info('Reading tracked subscriptions resource', {
            total: subscriptions.length,
        });

        return {
            contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({ subscriptions }, null, 2),
            }],
        };
    }

    @Resource({
        uri: 'subscriptions://imminent-alerts',
        name: 'Imminent No-Engagement Renewal Alerts',
        description: 'Subscriptions renewing within 48 hours that are also flagged NO_ENGAGEMENT.',
        mimeType: 'application/json',
        examples: {
            response: {
                alerts: [
                    {
                        service_name: 'Calm',
                        amount: 3999,
                        currency: 'INR',
                        billing_cycle: 'yearly',
                        next_renewal_date: '2026-07-18',
                        engagement_status: 'NO_ENGAGEMENT',
                    },
                ],
            },
        },
    })
    async getImminentAlerts(uri: string, ctx: ExecutionContext) {
        const alerts = this.subscriptionsService.getImminentNoEngagementAlerts();

        ctx.logger.info('Reading imminent subscription alerts resource', {
            total: alerts.length,
        });

        return {
            contents: [{
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({ alerts }, null, 2),
            }],
        };
    }
}
