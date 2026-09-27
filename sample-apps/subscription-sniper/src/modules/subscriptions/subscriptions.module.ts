import { Module } from '@nitrostack/core';
import { SubscriptionsPrompts } from './subscriptions.prompts.js';
import { SubscriptionsResources } from './subscriptions.resources.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionsTools } from './subscriptions.tools.js';

@Module({
    name: 'subscriptions',
    description: 'Subscription tracking and cancellation assistant module',
    controllers: [SubscriptionsTools, SubscriptionsResources, SubscriptionsPrompts],
    providers: [SubscriptionsService],
})
export class SubscriptionsModule { }
