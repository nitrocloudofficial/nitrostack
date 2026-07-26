import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ActionsModule } from './modules/actions/index.js';
import { AssessmentModule } from './modules/assessment/index.js';
import { DocumentsModule } from './modules/documents/index.js';
import { IncidentsModule } from './modules/incidents/index.js';
import { PromptsModule } from './modules/prompts/index.js';
import { ReadinessModule } from './modules/readiness/index.js';
import { ResourcesModule } from './modules/resources/index.js';
import { VerifiedDataModule } from './modules/verified-data/index.js';

/**
 * Root Application Module
 * 
 * ClaimShield server for incident documentation and evaluation.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'claimshield-server',
        version: '1.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'claimshield',
    description: 'ClaimShield triage and readiness assessment',
    imports: [
        ConfigModule.forRoot(),
        ActionsModule,
        AssessmentModule,
        DocumentsModule,
        IncidentsModule,
        PromptsModule,
        ReadinessModule,
        ResourcesModule,
        VerifiedDataModule
    ],
})
export class AppModule { }
