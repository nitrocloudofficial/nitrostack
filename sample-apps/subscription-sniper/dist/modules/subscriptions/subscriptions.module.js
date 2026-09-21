var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nitrostack/core';
import { SubscriptionsPrompts } from './subscriptions.prompts.js';
import { SubscriptionsResources } from './subscriptions.resources.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionsTools } from './subscriptions.tools.js';
let SubscriptionsModule = class SubscriptionsModule {
};
SubscriptionsModule = __decorate([
    Module({
        name: 'subscriptions',
        description: 'Subscription tracking and cancellation assistant module',
        controllers: [SubscriptionsTools, SubscriptionsResources, SubscriptionsPrompts],
        providers: [SubscriptionsService],
    })
], SubscriptionsModule);
export { SubscriptionsModule };
//# sourceMappingURL=subscriptions.module.js.map