import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AuditMapper } from '../../src/modules/audit/audit.mapper.js';
import type {
    Citation,
    Claim,
    VerificationResult,
    VerificationStatus,
} from '../../src/shared/contracts.js';

function claim(id: string, citationIds: string[] = []): Claim {
    return {
        id, text: `claim ${id}`, category: 'factual', extractionConfidence: 0.8,
        context: '', paragraphIndex: 0, citationMarkers: [], citationIds,
    };
}

function citation(id: string, over: Partial<Citation> = {}): Citation {
    return { id, raw: `raw ${id}`, marker: `[${id}]`, resolved: true, ...over };
}

function result(claimId: string, status: VerificationStatus, over: Partial<VerificationResult> = {}): VerificationResult {
    return {
        claimId, citationIds: [], existence: 'FOUND', status, confidence: 0.8,
        reason: '', supportingEvidence: [], contradictingEvidence: [], metadata: {}, ...over,
    };
}

describe('AuditMapper', () => {

    describe('buildSummary', () => {
        it('derives missingCitation from claims, not from verification results', () => {
            // This is the P0 regression guard. The original bug computed
            // missingCitation from a verifier field that never existed, so it
            // always equalled totalClaims and forced every verdict to CRITICAL.
            const summary = AuditMapper.buildSummary(
                [claim('c1', ['cit_1']), claim('c2', ['cit_1']), claim('c3')],
                [citation('cit_1')],
                [result('c1', 'SUPPORTED'), result('c2', 'SUPPORTED'), result('c3', 'UNRELATED')],
            );

            assert.equal(summary.missingCitation, 1);
            assert.notEqual(summary.missingCitation, summary.totalClaims);
            assert.equal(summary.citationCoverage, 0.67);
        });

        it('counts citation resolution and retraction', () => {
            const summary = AuditMapper.buildSummary(
                [claim('c1', ['a'])],
                [
                    citation('a', { resolved: true, retracted: true }),
                    citation('b', { resolved: false }),
                ],
                [result('c1', 'CONTRADICTED')],
            );

            assert.equal(summary.totalCitations, 2);
            assert.equal(summary.resolvedCitations, 1);
            assert.equal(summary.unresolvedCitations, 1);
            assert.equal(summary.retractedCitations, 1);
        });

        it('excludes ERROR results from average confidence', () => {
            const summary = AuditMapper.buildSummary(
                [claim('c1', ['a']), claim('c2', ['a'])],
                [citation('a')],
                [
                    result('c1', 'SUPPORTED', { confidence: 0.9 }),
                    result('c2', 'ERROR', { confidence: 0 }),
                ],
            );
            assert.equal(summary.averageConfidence, 0.9);
        });

        it('tolerates null and undefined inputs', () => {
            const summary = AuditMapper.buildSummary(
                undefined as unknown as Claim[],
                undefined as unknown as Citation[],
                undefined as unknown as VerificationResult[],
            );
            assert.equal(summary.totalClaims, 0);
            assert.equal(summary.citationCoverage, 0);
        });
    });

    describe('computeIntegrityScore', () => {
        const base = {
            unrelated: 0, insufficientEvidence: 0, missingCitation: 0, errors: 0,
            totalCitations: 0, resolvedCitations: 0, unresolvedCitations: 0,
            retractedCitations: 0, averageConfidence: 1,
        };

        it('awards 100 for fully supported, fully cited claims', () => {
            const score = AuditMapper.computeIntegrityScore({
                ...base, totalClaims: 3, supported: 3, contradicted: 0, citationCoverage: 1,
            });
            assert.equal(score, 100);
        });

        it('applies the coverage penalty proportionally', () => {
            const score = AuditMapper.computeIntegrityScore({
                ...base, totalClaims: 2, supported: 2, contradicted: 0, citationCoverage: 0,
            });
            assert.equal(score, 75, 'expected 100 minus the full 25-point coverage penalty');
        });

        it('penalises retracted references, capped', () => {
            const score = AuditMapper.computeIntegrityScore({
                ...base, totalClaims: 1, supported: 1, contradicted: 0,
                citationCoverage: 1, retractedCitations: 9,
            });
            assert.equal(score, 80, 'retraction penalty must cap at 20');
        });

        it('excludes ERROR claims from the denominator', () => {
            // A provider outage is our failure, not the author's.
            const withErrors = AuditMapper.computeIntegrityScore({
                ...base, totalClaims: 4, supported: 2, contradicted: 0, errors: 2, citationCoverage: 1,
            });
            const withoutErrors = AuditMapper.computeIntegrityScore({
                ...base, totalClaims: 2, supported: 2, contradicted: 0, citationCoverage: 1,
            });
            assert.equal(withErrors, withoutErrors);
        });

        it('never leaves the [0, 100] range', () => {
            const worst = AuditMapper.computeIntegrityScore({
                ...base, totalClaims: 5, supported: 0, contradicted: 5,
                citationCoverage: 0, retractedCitations: 20,
            });
            assert.ok(worst >= 0 && worst <= 100);
            assert.equal(worst, 0);
        });

        it('returns 0 when nothing was scoreable', () => {
            assert.equal(AuditMapper.computeIntegrityScore({
                ...base, totalClaims: 0, supported: 0, contradicted: 0, citationCoverage: 0,
            }), 0);
        });
    });

    describe('scoreToSeverity', () => {
        it('maps score bands to severity', () => {
            assert.equal(AuditMapper.scoreToSeverity(100), 'GREEN');
            assert.equal(AuditMapper.scoreToSeverity(80), 'GREEN');
            assert.equal(AuditMapper.scoreToSeverity(79), 'AMBER');
            assert.equal(AuditMapper.scoreToSeverity(55), 'AMBER');
            assert.equal(AuditMapper.scoreToSeverity(54), 'RED');
            assert.equal(AuditMapper.scoreToSeverity(0), 'RED');
        });
    });

    describe('normalisation', () => {
        it('clamps out-of-range confidence instead of propagating it', () => {
            const [normalised] = AuditMapper.normaliseResults([
                result('c1', 'SUPPORTED', { confidence: 42 }),
                result('c2', 'SUPPORTED', { confidence: -5 }),
            ]);
            assert.equal(normalised.confidence, 1);
            assert.equal(AuditMapper.normaliseResults([result('c2', 'SUPPORTED', { confidence: -5 })])[0].confidence, 0);
        });

        it('guarantees array fields exist', () => {
            const [normalised] = AuditMapper.normaliseResults([
                { claimId: 'c1', status: 'SUPPORTED' } as unknown as VerificationResult,
            ]);
            assert.deepEqual(normalised.supportingEvidence, []);
            assert.deepEqual(normalised.contradictingEvidence, []);
            assert.deepEqual(normalised.citationIds, []);
            assert.deepEqual(normalised.metadata, {});
        });
    });

    describe('buildReport', () => {
        it('assembles a complete report', () => {
            const report = AuditMapper.buildReport({
                documentName: 'doc.pdf',
                claims: [claim('c1', ['a'])],
                citations: [citation('a')],
                results: [result('c1', 'SUPPORTED')],
                durationMs: 42,
                offlineMode: true,
            });

            assert.equal(report.documentName, 'doc.pdf');
            assert.equal(report.durationMs, 42);
            assert.equal(report.offlineMode, true);
            assert.ok(report.verdict);
            assert.ok(!Number.isNaN(Date.parse(report.generatedAt)));
            assert.equal(report.integrityScore, 100);
            assert.equal(report.severity, 'GREEN');
        });

        it('never emits a negative duration', () => {
            const report = AuditMapper.buildReport({
                documentName: 'd', claims: [], citations: [], results: [],
                durationMs: -10, offlineMode: false,
            });
            assert.equal(report.durationMs, 0);
        });
    });
});
