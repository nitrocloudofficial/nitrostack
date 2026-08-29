import { ExecutionContext } from '@nitrostack/core';
import { SubscriptionsService } from './subscriptions.service.js';
export declare class SubscriptionsResources {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    getTrackedSubscriptions(uri: string, ctx: ExecutionContext): Promise<{
        contents: {
            uri: string;
            mimeType: string;
            text: string;
        }[];
    }>;
    getImminentAlerts(uri: string, ctx: ExecutionContext): Promise<{
        contents: {
            uri: string;
            mimeType: string;
            text: string;
        }[];
    }>;
}
//# sourceMappingURL=subscriptions.resources.d.ts.map