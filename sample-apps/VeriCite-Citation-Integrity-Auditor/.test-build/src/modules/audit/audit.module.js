var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nitrostack/core';
import { AuditTools } from './audit.tools.js';
import { ClaimExtractorService } from './claim-extractor.service.js';
import { CitationExtractorService } from './citation-extractor.service.js';
import { VerificationModule } from '../verification/verification.module.js';
/**
 * AuditModule
 *
 * Owns extraction and orchestration. Verification is delegated to
 * VerificationModule, which wraps the vendored engine.
 *
 * `ScholarlyApiService` and the audit-local `SupportVerifierService`
 * were removed in the P0-2 integration: the first duplicated
 * Crossref/OpenAlex logic the engine already implements (against the
 * wrong query — claim text rather than the cited work), and the
 * second was superseded by the engine's LLM support verifier.
 *
 * AuditMapper, TrustVerdictEngine and ContradictionAnalyzer are pure
 * static classes with no dependencies, so they are imported directly
 * rather than registered with the DI container.
 */
let AuditModule = class AuditModule {
};
AuditModule = __decorate([
    Module({
        name: 'audit',
        description: 'Claim extraction, citation linking, and audit orchestration',
        imports: [VerificationModule],
        controllers: [AuditTools],
        providers: [
            ClaimExtractorService,
            CitationExtractorService,
        ],
    })
], AuditModule);
export { AuditModule };
//# sourceMappingURL=audit.module.js.map