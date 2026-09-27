var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ResourceDecorator as Resource, Injectable } from '@nitrostack/core';
import { SubscriptionsService } from './subscriptions.service.js';
let SubscriptionsResources = class SubscriptionsResources {
    subscriptionsService;
    constructor(subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }
    async getTrackedSubscriptions(uri, ctx) {
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
    async getImminentAlerts(uri, ctx) {
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
};
__decorate([
    Resource({
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
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsResources.prototype, "getTrackedSubscriptions", null);
__decorate([
    Resource({
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
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsResources.prototype, "getImminentAlerts", null);
SubscriptionsResources = __decorate([
    Injectable({ deps: [SubscriptionsService] }),
    __metadata("design:paramtypes", [SubscriptionsService])
], SubscriptionsResources);
export { SubscriptionsResources };
//# sourceMappingURL=subscriptions.resources.js.map