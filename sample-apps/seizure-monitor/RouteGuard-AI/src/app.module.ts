import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { PizzazModule } from './modules/pizzaz/pizzaz.module.js';

import { SentinelModule } from './modules/sentinel/sentinel.module.js';
import { ImpactModule } from './modules/impact/impact.module.js';
import { BrokerageModule } from './modules/brokerage/brokerage.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';

/**
 * Root Application Module
 * 
 * Pizza shop finder with interactive maps.
 * Showcases NitroStack Widget SDK features.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'pizzaz-finder',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'pizzaz',
    description: 'Pizza shop finder with interactive maps',
    imports: [
        ConfigModule.forRoot(),
        PizzazModule,
        SentinelModule,
        ImpactModule,
        BrokerageModule,
        NotificationModule
    ],
})
export class AppModule { }
