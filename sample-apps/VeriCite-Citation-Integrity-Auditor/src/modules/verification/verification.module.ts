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
@Module({
    name: 'verification',
    description: 'Citation-first verification across Crossref, OpenAlex and Semantic Scholar',
    providers: [
        OfflineVerificationService,
        CitationVerificationService,
    ],
    exports: [CitationVerificationService],
})
export class VerificationModule { }
