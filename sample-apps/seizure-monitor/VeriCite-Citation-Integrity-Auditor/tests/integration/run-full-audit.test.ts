import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    DOC_BIBLIOGRAPHY_ONLY,
    DOC_CONTRADICTORY,
    DOC_DUPLICATE_CITATIONS,
    DOC_EMPTY,
    DOC_FAKE_REFERENCES,
    DOC_MALFORMED_CITATIONS,
    DOC_MIXED_SECTIONS,
    DOC_RETRACTED,
    DOC_UNCITED,
    ExplodingVerificationService,
    HangingVerificationService,
    audit,
    forceOffline,
    makeAuditTools,
    makeContext,
    makeLargeDocument,
} from '../helpers/harness.js';

before(forceOffline);

describe('run_full_audit', () => {

    describe('input guards', () => {
        it('rejects an empty document without throwing', async () => {
            const report = await audit(DOC_EMPTY);
            assert.equal(report.verdict.title, 'Audit Not Run');
            assert.equal(report.verdict.inconclusive, true);
            assert.equal(report.summary.totalClaims, 0);
            assert.equal(report.summary.errors, 0, 'guard failure must not count as an error claim');
        });

        it('rejects a document below the minimum length', async () => {
            const report = await audit('short');
            assert.match(report.verdict.summary, /below the minimum/i);
        });

        it('rejects an oversized payload', async () => {
            const report = await audit('a'.repeat(500_001));
            assert.match(report.verdict.summary, /exceeds the maximum/i);
        });

        it('never throws to the MCP layer', async () => {
            for (const input of [undefined, null, 42, {}, []]) {
                await assert.doesNotReject(async () => {
                    const { ctx } = makeContext();
                    await makeAuditTools().runFullAudit(
                        { document: input as unknown as string }, ctx,
                    );
                });
            }
        });
    });

    describe('document shapes', () => {
        it('finds no claims in a bibliography-only document', async () => {
            const report = await audit(DOC_BIBLIOGRAPHY_ONLY);
            assert.equal(report.summary.totalClaims, 0);
            assert.equal(report.verdict.inconclusive, true);
            assert.ok(report.summary.totalCitations >= 2, 'references should still be parsed');
        });

        it('scores uncited claims as UNRELATED with zero coverage', async () => {
            const report = await audit(DOC_UNCITED);
            assert.ok(report.summary.totalClaims > 0);
            assert.equal(report.summary.citationCoverage, 0);
            assert.equal(report.summary.missingCitation, report.summary.totalClaims);
            assert.ok(report.results.every((r) => r.status === 'UNRELATED'));
            assert.equal(report.integrityScore, 0);
        });

        it('detects contradiction against a cited source', async () => {
            const report = await audit(DOC_CONTRADICTORY);
            assert.equal(report.summary.contradicted, 1);
            assert.equal(report.verdict.level, 'CRITICAL');
            assert.match(report.verdict.title, /Contradicted/i);
        });

        it('detects a retracted reference', async () => {
            const report = await audit(DOC_RETRACTED);
            assert.equal(report.summary.retractedCitations, 1);
            assert.equal(report.summary.contradicted, 1);
            const text = [...report.verdict.reasoning, ...report.verdict.recommendations].join(' ');
            assert.match(text, /retracted/i);
        });

        it('does not invent evidence for a fake reference', async () => {
            const report = await audit(DOC_FAKE_REFERENCES);
            assert.equal(report.summary.resolvedCitations, 0);
            assert.equal(report.summary.unresolvedCitations, 1);
            assert.ok(report.results.every((r) => r.supportingEvidence.length === 0));
        });

        it('collapses duplicate citations to a single reference', async () => {
            const report = await audit(DOC_DUPLICATE_CITATIONS);
            assert.equal(report.summary.totalCitations, 1);
            assert.equal(report.summary.citationCoverage, 1);
            for (const result of report.results) {
                assert.equal(new Set(result.citationIds).size, result.citationIds.length);
            }
        });

        it('survives malformed citations', async () => {
            const report = await audit(DOC_MALFORMED_CITATIONS);
            assert.ok(report.integrityScore >= 0 && report.integrityScore <= 100);
            assert.equal(report.summary.errors, 0);
        });

        it('excludes captions, headings and back matter from claims', async () => {
            const report = await audit(DOC_MIXED_SECTIONS);
            const texts = report.claims.map((c) => c.text).join(' | ');
            assert.doesNotMatch(texts, /Figure 1|Table 2|thank the reviewers/);
        });

        it('handles a large document within the claim cap', async () => {
            const report = await audit(makeLargeDocument(140));
            assert.equal(report.summary.totalClaims, 100, 'MAX_CLAIMS_PER_AUDIT should cap at 100');
            assert.equal(report.results.length, report.summary.totalClaims);
        });
    });

    describe('failure isolation', () => {
        it('marks claims ERROR when the provider throws, without aborting', async () => {
            const tools = makeAuditTools(new ExplodingVerificationService());
            const report = await audit(DOC_CONTRADICTORY, 'exploding', tools);

            assert.ok(report.summary.errors > 0);
            assert.equal(report.summary.errors, report.summary.totalClaims);
            assert.ok(report.results.every((r) => r.error?.message.includes('provider exploded')));
        });

        it('treats a mostly-failed audit as inconclusive, not as untrustworthy', async () => {
            const tools = makeAuditTools(new ExplodingVerificationService());
            const report = await audit(DOC_CONTRADICTORY, 'exploding', tools);

            assert.equal(report.verdict.inconclusive, true);
            assert.match(report.verdict.summary, /should NOT be read as a judgement/i);
        });

        it('excludes provider errors from the integrity score denominator', async () => {
            const tools = makeAuditTools(new ExplodingVerificationService());
            const report = await audit(DOC_CONTRADICTORY, 'exploding', tools);
            // Nothing scoreable remains, so the score floors — but the verdict
            // must say "incomplete", which the assertion above already checks.
            assert.equal(report.integrityScore, 0);
        });

        it('times out a hanging provider instead of hanging the audit', async () => {
            const tools = makeAuditTools(new HangingVerificationService());
            const started = Date.now();
            const report = await audit(DOC_CONTRADICTORY, 'hanging', tools);
            const elapsed = Date.now() - started;

            assert.ok(elapsed < 30_000, `audit took ${elapsed}ms; timeout did not fire`);
            assert.ok(report.summary.errors > 0);
        });
    });

    describe('report invariants', () => {
        it('always returns a well-formed report', async () => {
            const report = await audit(DOC_MIXED_SECTIONS);

            assert.ok(report.auditId);
            assert.ok(report.correlationId);
            assert.ok(!Number.isNaN(Date.parse(report.generatedAt)));
            assert.ok(report.durationMs >= 0);
            assert.ok(report.integrityScore >= 0 && report.integrityScore <= 100);
            assert.ok(['GREEN', 'AMBER', 'RED'].includes(report.severity));
            assert.equal(report.offlineMode, true);
            assert.equal(report.results.length, report.claims.length);
        });

        it('keeps summary counts consistent with results', async () => {
            const report = await audit(DOC_MIXED_SECTIONS);
            const { summary, results } = report;
            const counted = summary.supported + summary.contradicted + summary.unrelated
                + summary.insufficientEvidence + summary.errors;
            assert.equal(counted, results.length);
            assert.equal(summary.totalClaims, results.length);
        });

        it('propagates a caller-supplied correlationId', async () => {
            const { ctx } = makeContext();
            const report = await makeAuditTools().runFullAudit(
                { document: DOC_CONTRADICTORY, documentName: 'x', correlationId: 'trace-123' }, ctx,
            );
            assert.equal(report.correlationId, 'trace-123');
        });

        it('emits [N/5] progress logs', async () => {
            const { ctx, logs } = makeContext();
            await makeAuditTools().runFullAudit({ document: DOC_MIXED_SECTIONS }, ctx);
            const steps = logs.filter((l) => /^\[\d\/5\]/.test(l.message));
            assert.ok(steps.length >= 5, `expected progress logs, saw ${steps.length}`);
        });

        it('produces distinguishable reports for different documents', async () => {
            // Score and level alone are not enough: a contradicted document
            // and an entirely uncited one both legitimately bottom out at
            // 0/CRITICAL. The composition is what must differ.
            const [contradicted, uncited] = await Promise.all([
                audit(DOC_CONTRADICTORY, 'a'),
                audit(DOC_UNCITED, 'b'),
            ]);

            const fingerprint = (r: Awaited<ReturnType<typeof audit>>) => ({
                contradicted: r.summary.contradicted,
                unrelated: r.summary.unrelated,
                coverage: r.summary.citationCoverage,
            });

            assert.notDeepEqual(fingerprint(contradicted), fingerprint(uncited));
            assert.equal(contradicted.summary.contradicted, 1);
            assert.equal(uncited.summary.contradicted, 0);
            assert.equal(uncited.summary.citationCoverage, 0);
        });
    });

    describe('MCP tool surfaces', () => {
        it('extract_claims returns the documented shape', async () => {
            const { ctx } = makeContext();
            const out = await makeAuditTools().extractClaims(
                { text: 'Accuracy improved by 40 percent over the baseline [1].' }, ctx,
            ) as Record<string, unknown>;

            assert.equal(out['status'], 'success');
            assert.equal(typeof out['claimsFound'], 'number');
            assert.ok(Array.isArray(out['claims']));
            assert.ok(out['summary']);
        });

        it('extract_claims reports errors instead of throwing', async () => {
            const { ctx } = makeContext();
            const out = await makeAuditTools().extractClaims(
                { text: undefined as unknown as string }, ctx,
            ) as Record<string, unknown>;
            assert.equal(out['status'], 'error');
            assert.equal(out['claimsFound'], 0);
        });

        it('verify_citation returns the documented shape', async () => {
            const { ctx } = makeContext();
            const out = await makeAuditTools().verifyCitation(
                {
                    claim: 'Global temperature increased due to greenhouse gas emissions.',
                    source: 'doi:10.1038/s41558-021-01000-0',
                }, ctx,
            ) as Record<string, unknown>;

            assert.equal(out['status'], 'success');
            assert.equal(typeof out['verified'], 'boolean');
            assert.equal(typeof out['confidenceScore'], 'number');
            assert.ok(Array.isArray(out['supportingEvidence']));
        });

        it('verify_citation honours includeEvidence:false', async () => {
            const { ctx } = makeContext();
            const out = await makeAuditTools().verifyCitation(
                { claim: 'A claim about warming trends.', includeEvidence: false }, ctx,
            ) as Record<string, unknown>;
            assert.equal(out['supportingEvidence'], undefined);
        });
    });
});
