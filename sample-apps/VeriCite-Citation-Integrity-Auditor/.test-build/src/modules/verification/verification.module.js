var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nitrostack/core';
import { CitationVerificationService } from './citation-verification.service.js';
import { OfflineVerificationService } from './offline-verification.service.js';
/**
 * VerificationModule
 *
 * Wraps the vendored Verification Engine and exposes exactly one
 * provider to the rest of the application: `CitationVerificationService`.
 *
 * The engine's own provider classes (Crossref, OpenAlex, Semantic
 * Scholar, Groq support verifier) are intentionally NOT registered
 * with the DI container. They are composed internally by
 * `VerificationService`, which is how the engine was written and
 * tested; re-registering them here would duplicate that wiring for
 * no benefit and create two construction paths for the same objects.
 */
let VerificationModule = class VerificationModule {
};
VerificationModule = __decorate([
    Module({
        name: 'verification',
        description: 'Citation-first verification across Crossref, OpenAlex and Semantic Scholar',
        providers: [
            OfflineVerificationService,
            CitationVerificationService,
        ],
        exports: [CitationVerificationService],
    })
], VerificationModule);
export { VerificationModule };
//# sourceMappingURL=verification.module.js.map