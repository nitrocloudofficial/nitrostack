import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TrustVerdictEngine } from '../../src/modules/audit/trust-verdict.engine.js';
function summary(over = {}) {
    return {
        totalClaims: 10, supported: 10, contradicted: 0, unrelated: 0,
        insufficientEvidence: 0, missingCitation: 0, errors: 0,
        totalCitations: 10, resolvedCitations: 10, unresolvedCitations: 0,
        retractedCitations: 0, citationCoverage: 1, averageConfidence: 0.9,
        ...over,
    };
}
const verdict = (score, s = {}, results = []) => TrustVerdictEngine.computeVerdict({
    integrityScore: score, summary: summary(s), results, citations: [],
});
describe('TrustVerdictEngine', () => {
    describe('degeneracy regression', () => {
        it('does NOT force CRITICAL when most claims are uncited', () => {
            // The original engine escalated to CRITICAL whenever
            // missingRatio > 0.5. Combined with a mapper bug that marked
            // every claim missing, CRITICAL became the only reachable level.
            const v = verdict(85, { missingCitation: 9, citationCoverage: 0.1 });
            assert.notEqual(v.level, 'CRITICAL');
        });
        it('reaches all four levels', () => {
            const levels = new Set([
                verdict(100).level,
                verdict(70, { supported: 7, insufficientEvidence: 3 }).level,
                verdict(50, { supported: 3, unrelated: 7 }).level,
                verdict(10, { supported: 0, contradicted: 10 }).level,
            ]);
            assert.equal(levels.size, 4, `expected 4 distinct levels, got ${[...levels]}`);
        });
    });
    describe('classification', () => {
        it('awards HIGH_TRUST only with no contradictions', () => {
            assert.equal(verdict(100).level, 'HIGH_TRUST');
        });
        it('caps at MODERATE_TRUST when any contradiction exists', () => {
            const v = verdict(95, { supported: 9, contradicted: 1 });
            assert.equal(v.level, 'MODERATE_TRUST');
        });
        it('escalates to CRITICAL past the contradiction ratio', () => {
            assert.equal(verdict(60, { supported: 7, contradicted: 3 }).level, 'CRITICAL');
        });
        it('escalates to CRITICAL on a very low score', () => {
            assert.equal(verdict(20, { supported: 1, unrelated: 9 }).level, 'CRITICAL');
        });
    });
    describe('inconclusive handling', () => {
        it('flags inconclusive when most claims errored', () => {
            const v = verdict(50, { supported: 2, errors: 8 });
            assert.equal(v.inconclusive, true);
            assert.match(v.title, /Audit Incomplete/i);
            assert.match(v.summary, /should NOT be read as a judgement/i);
        });
        it('does not flag inconclusive for a genuinely bad document', () => {
            const v = verdict(5, { supported: 0, contradicted: 10 });
            assert.equal(v.inconclusive, false);
        });
        it('reports no-claims as inconclusive, not as untrustworthy', () => {
            const v = verdict(0, { totalClaims: 0, supported: 0, citationCoverage: 0 });
            assert.equal(v.inconclusive, true);
            assert.match(v.summary, /reflects the input/i);
        });
    });
    describe('explainability', () => {
        it('always populates every narrative field', () => {
            for (const v of [verdict(100), verdict(50, { supported: 5, unrelated: 5 }), verdict(0, { supported: 0, contradicted: 10 })]) {
                assert.ok(v.title.length > 0);
                assert.ok(v.summary.length > 0);
                assert.ok(v.reasoning.length > 0);
                assert.ok(v.strengths.length > 0);
                assert.ok(v.weaknesses.length > 0);
                assert.ok(v.confidence >= 0.1 && v.confidence <= 1);
            }
        });
        it('names retraction explicitly', () => {
            const v = verdict(40, { supported: 5, contradicted: 5, retractedCitations: 2 });
            const text = [...v.reasoning, ...v.weaknesses, ...v.recommendations].join(' ');
            assert.match(text, /RETRACTED|retracted/);
        });
        it('recommends action for contradictions', () => {
            const v = verdict(20, { supported: 2, contradicted: 8 });
            assert.match(v.recommendations.join(' '), /URGENT/);
        });
        it('is deterministic', () => {
            assert.deepEqual(verdict(72, { supported: 7, unrelated: 3 }), verdict(72, { supported: 7, unrelated: 3 }));
        });
    });
    describe('defensiveness', () => {
        it('survives malformed input', () => {
            const v = TrustVerdictEngine.computeVerdict({
                integrityScore: Number.NaN,
                summary: undefined,
                results: undefined,
                citations: undefined,
            });
            assert.ok(v.level);
            assert.ok(!Number.isNaN(v.confidence));
        });
        it('clamps the score into range', () => {
            assert.equal(verdict(1000).score, 100);
            assert.equal(verdict(-50, { supported: 0, contradicted: 10 }).score, 0);
        });
    });
});
//# sourceMappingURL=trust-verdict.test.js.map