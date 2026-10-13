import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { GovernanceModule } from './modules/governance/governance.module.js';

/**
 * Root Application Module
 *
 * Aegis — audits an AI agent's effective permissions and detects toxic
 * capability combinations (a "blast-radius" auditor).
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'aegis',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'aegis',
    description: 'Aegis — blast-radius auditor for AI agent tool permissions',
    imports: [
        ConfigModule.forRoot(),
        GovernanceModule
    ],
})
export class AppModule { }
