import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';

/**
 * Root Application Module
 *
 * Subscription tracking and cancellation assistant.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'subscription-sniper',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'subscription-sniper',
    description: 'Subscription tracking and cancellation assistant',
    imports: [
        ConfigModule.forRoot(),
        SubscriptionsModule
    ],
})
export class AppModule { }
