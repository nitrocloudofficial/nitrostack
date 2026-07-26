// tests/helpers/harness.ts
/**
 * Shared test fixtures and fakes.
 *
 * Every integration test runs in OFFLINE mode so the suite is
 * deterministic, hermetic and CI-safe: no network, no API keys, no
 * rate limits. Provider-failure behaviour is exercised with explicit
 * fakes rather than by relying on a real endpoint misbehaving.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resetConfig } from '../../src/shared/config.js';
import { AuditTools } from '../../src/modules/audit/audit.tools.js';
import { ClaimExtractorService } from '../../src/modules/audit/claim-extractor.service.js';
import { CitationExtractorService } from '../../src/modules/audit/citation-extractor.service.js';
import { CitationVerificationService } from '../../src/modules/verification/citation-verification.service.js';
import { OfflineVerificationService } from '../../src/modules/verification/offline-verification.service.js';
/**
 * Force fixture-backed verification for the whole suite, and shrink
 * the per-claim budget so the timeout test finishes quickly.
 */
export function forceOffline() {
    process.env['VERICITE_OFFLINE'] = 'true';
    process.env['VERICITE_CLAIM_BUDGET_MS'] = '5000';
    resetConfig();
}
/** Minimal ExecutionContext that records what was logged. */
export function makeContext() {
    const logs = [];
    const push = (level) => (message) => {
        logs.push({ level, message });
    };
    const ctx = {
        logger: {
            info: push('info'),
            warn: push('warn'),
            error: push('error'),
            debug: () => undefined,
        },
    };
    return { ctx, logs };
}
/** AuditTools wired with the real pipeline, offline verification. */
export function makeAuditTools(verifier = new CitationVerificationService(new OfflineVerificationService())) {
    return new AuditTools(new ClaimExtractorService(), new CitationExtractorService(), verifier);
}
/**
 * A verifier that always throws — used to prove the orchestrator
 * isolates provider failures instead of aborting the audit.
 */
export class ExplodingVerificationService extends CitationVerificationService {
    failure;
    constructor(failure = new Error('provider exploded')) {
        super(new OfflineVerificationService());
        this.failure = failure;
    }
    async verifyClaimWithResolutions() {
        throw this.failure;
    }
}
/** A verifier that never settles — used to prove timeout handling. */
export class HangingVerificationService extends CitationVerificationService {
    constructor() {
        super(new OfflineVerificationService());
    }
    async verifyClaimWithResolutions() {
        return new Promise(() => {
            /* intentionally never resolves */
        });
    }
}
/* ------------------------------------------------------------
 * Demo corpus (Test cases/)
 * ---------------------------------------------------------- */
const TEST_CASES_DIR = join(process.cwd(), 'Test cases');
export function loadDemoDocuments() {
    return readdirSync(TEST_CASES_DIR)
        .filter((f) => f.toLowerCase().endsWith('.txt'))
        .sort()
        .map((name) => ({
        name,
        text: readFileSync(join(TEST_CASES_DIR, name), 'utf-8'),
    }));
}
/* ------------------------------------------------------------
 * Synthetic documents for edge cases
 * ---------------------------------------------------------- */
export const DOC_EMPTY = '';
export const DOC_BIBLIOGRAPHY_ONLY = `References

[1] Hegerl, G., Zwiers, F. 2021. Attribution of observed global surface warming to anthropogenic forcing. Nature Climate Change. doi:10.1038/s41558-021-01000-0
[2] Vaswani, A., Shazeer, N. 2017. Attention mechanisms in sequence transduction models. NeurIPS. doi:10.5555/3295222.3295349
`;
export const DOC_UNCITED = `Our internal framework increases developer throughput by 400 percent.

The scheduler reduces queue latency because of adaptive reallocation.
`;
export const DOC_CONTRADICTORY = `Immunisation with the measles vaccine causes autism in children [1].

References

[1] Hviid, A., Hansen, J. 2019. Nationwide cohort study of measles vaccination and autism risk. Annals of Internal Medicine. doi:10.7326/M18-2101
`;
export const DOC_RETRACTED = `Immunisation with the measles vaccine causes autism in children [1].

References

[1] Wakefield, A. 1998. Ileal-lymphoid-nodular hyperplasia and developmental disorder in children. The Lancet. doi:10.1016/S0140-6736(97)11096-0
`;
export const DOC_FAKE_REFERENCES = `Quantum entanglement enables faster-than-light communication in silicon [1].

References

[1] Nonexistent, Q. 2031. A Paper That Was Never Written About Nothing At All. Journal of Imaginary Studies. doi:10.9999/not-a-real-doi-99999
`;
export const DOC_DUPLICATE_CITATIONS = `Global mean surface temperature has increased due to greenhouse gas emissions [1].

Anthropogenic emissions drive the observed warming trend [1].

Ice sheet mass loss contributes to sea level rise [1][1].

References

[1] Hegerl, G., Zwiers, F. 2021. Attribution of observed global surface warming to anthropogenic forcing. Nature Climate Change. doi:10.1038/s41558-021-01000-0
`;
export const DOC_MALFORMED_CITATIONS = `Global temperature has increased because of emissions [999].

Attention improves model quality (NotAnAuthor 20XX).

Sea level is rising [.

Another assertion about warming [1-.

References

[[[ malformed entry with no structure
=====================================
;;;
`;
export const DOC_MIXED_SECTIONS = `Introduction

Global mean surface temperature has increased due to anthropogenic emissions [1].

Figure 1. Global temperature anomaly relative to the 1850-1900 baseline.

Table 2. Regional warming rates by decade.

Methods

We reduced the dataset using standard techniques [1].

Acknowledgements

We thank the reviewers for their extremely helpful and detailed comments.

References

[1] Hegerl, G., Zwiers, F. 2021. Attribution of observed global surface warming to anthropogenic forcing. Nature Climate Change. doi:10.1038/s41558-021-01000-0
`;
/** Build a document with `n` cited body claims plus a matching bibliography. */
export function makeLargeDocument(n) {
    const body = [];
    const refs = [];
    for (let i = 1; i <= n; i++) {
        body.push(`Observed surface temperature increased by ${i} percent in region ${i} [${i}].`);
        refs.push(`[${i}] Author${i}, A. 20${String(10 + (i % 15)).padStart(2, '0')}. `
            + `Study number ${i} of regional warming attribution. Journal of Testing.`);
    }
    return `${body.join('\n\n')}\n\nReferences\n\n${refs.join('\n')}\n`;
}
/** Convenience: run a full audit and return the report. */
export async function audit(document, documentName = 'test-document', tools = makeAuditTools()) {
    const { ctx } = makeContext();
    return tools.runFullAudit({ document, documentName }, ctx);
}
//# sourceMappingURL=harness.js.map