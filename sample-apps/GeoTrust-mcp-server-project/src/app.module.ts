import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { RegistryModule } from './modules/registry/registry.module.js';
import { AddressModule } from './modules/address/address.module.js';
import { WebPresenceModule } from './modules/web-presence/web-presence.module.js';
import { ScoringModule } from './modules/scoring/scoring.module.js';
import { CaseStoreModule } from './modules/case-store/case-store.module.js';
import { DigitalFootprintModule } from './modules/digital-footprint/digital-footprint.module.js';
import { DocumentIntegrityModule } from './modules/document-integrity/document-integrity.module.js';
import { FraudPatternModule } from './modules/fraud-network/fraud-pattern.module.js';
import { ComplianceModule } from './modules/compliance/compliance.module.js';

/**
 * Root Application Module — GeoTrust AI
 *
 * Business authenticity investigation engine.
 * Seven sub-agent modules + shared CaseStore state.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'geotrust-ai',
        version: '2.0.0'
    },
    logging: {
        level: 'info'
    }
})
@Module({
    name: 'geotrust-ai',
    description: 'Business authenticity investigation for SME loan onboarding — 7 sub-agents',
    imports: [
        CaseStoreModule,
        DocumentsModule,          // Identity + Financial tools
        RegistryModule,           // validateRegistration
        AddressModule,            // verifyAddress (Location sub-agent)
        WebPresenceModule,        // Legacy web_presence_checker (kept for backward compat)
        ScoringModule,            // computeAuthenticityScore
        DigitalFootprintModule,   // inspectDomain, analyseDigitalFootprint
        DocumentIntegrityModule,  // detectDocumentTampering, checkDuplicateDocument, validateDocumentFormat
        FraudPatternModule,       // checkApplicationHistory, detectSharedIdentifiers, searchDuplicateEntities
        ComplianceModule,         // logAuditEvent, maskSensitiveField, getAuditTrail
    ],
    providers: [
        { provide: 'OAUTH_CONFIG', useValue: { resourceUri: 'http://localhost' } }
    ]
})
export class AppModule { }
