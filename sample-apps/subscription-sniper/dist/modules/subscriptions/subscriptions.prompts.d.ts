import { ExecutionContext } from '@nitrostack/core';
import { SubscriptionsService } from './subscriptions.service.js';
export declare class SubscriptionsPrompts {
    private readonly subscriptionsService;
    constructor(subscriptionsService: SubscriptionsService);
    getAuditStrategistPrompt(args: Record<string, never>, ctx: ExecutionContext): Promise<{
        role: "user";
        content: string;
    }[]>;
    getProactiveNotifierPrompt(args: {
        service_name?: string;
    }, ctx: ExecutionContext): Promise<{
        role: "user";
        content: string;
    }[]>;
}
//# sourceMappingURL=subscriptions.prompts.d.ts.map