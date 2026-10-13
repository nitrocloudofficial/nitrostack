import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { SentryFlowModule } from './modules/sentryflow/sentryflow.module.js';

/**
 * Root Application Module
 * 
 * SentryFlow fraud investigation and Safe-T claim workflows.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'sentryflow',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'sentryflow-hub',
    description: 'Fraud investigation and Safe-T claim workflows with NitroStack widgets',
    imports: [
        ConfigModule.forRoot(),
        SentryFlowModule
    ],
})
export class AppModule { }
