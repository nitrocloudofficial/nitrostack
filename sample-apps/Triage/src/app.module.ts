import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { PizzazModule } from './modules/pizzaz/pizzaz.module.js';
import { TriageModule } from './modules/triage/triage.module.js';
import { HospitalModule } from './modules/hospital-finder/hospital.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module.js';
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
    name: 'app',
    imports: [
        ConfigModule.forRoot(),
        PizzazModule,
        TriageModule,
        HospitalModule,
        NotificationModule,
        OrchestratorModule
    ],
})
export class AppModule { }