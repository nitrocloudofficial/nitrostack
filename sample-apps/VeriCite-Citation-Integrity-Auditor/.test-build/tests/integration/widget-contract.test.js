import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DOC_MIXED_SECTIONS, DOC_RETRACTED, DOC_UNCITED, audit, forceOffline, } from '../helpers/harness.js';
before(forceOffline);
/**
 * The widget renders `AuditReport` directly from `getToolOutput()`.
 * These tests pin every field the widget actually reads, so a server
 * contract change that would blank a panel fails here rather than
 * silently rendering an empty card.
 *
 * Field list mirrors src/widgets/app/integrity-report/page.tsx.
 */
describe('widget data contract', () => {
    const readsFromReport = [
        'documentName', 'generatedAt', 'durationMs', 'integrityScore',
        'severity', 'verdict', 'claims', 'citations', 'results', 'summary',
    ];
    const readsFromSummary = [
        'totalClaims', 'supported', 'contradicted', 'unrelated',
        'insufficientEvidence', 'missingCitation', 'errors',
    ];
    const readsFromVerdict = [
        'level', 'score', 'title', 'summary', 'reasoning',
        'strengths', 'weaknesses', 'recommendations', 'confidence',
    ];
    it('provides every top-level field the widget reads', async () => {
        const report = await audit(DOC_MIXED_SECTIONS);
        for (const field of readsFromReport) {
            assert.ok(field in report, `AuditReport.${field} missing`);
            assert.notEqual(report[field], undefined, `AuditReport.${field} undefined`);
        }
    });
    it('provides every summary KPI card value', async () => {
        const report = await audit(DOC_MIXED_SECTIONS);
        for (const field of readsFromSummary) {
            const value = report.summary[field];
            assert.equal(typeof value, 'number', `summary.${field} must be a number`);
            assert.ok(Number.isFinite(value), `summary.${field} not finite`);
        }
    });
    it('provides every Trust Verdict panel field', async () => {
        const report = await audit(DOC_MIXED_SECTIONS);
        for (const field of readsFromVerdict) {
            assert.notEqual(report.verdict[field], undefined, `verdict.${field} missing`);
        }
        for (const list of ['reasoning', 'strengths', 'weaknesses', 'recommendations']) {
            assert.ok(Array.isArray(report.verdict[list]), `verdict.${list} must be an array`);
        }
    });
    it('keeps claimId joinable between results and claims', async () => {
        // The widget builds `new Map(claims.map(c => [c.id, c]))` and looks up
        // by result.claimId. An unjoinable id renders a bare id instead of text.
        const report = await audit(DOC_MIXED_SECTIONS);
        const ids = new Set(report.claims.map((c) => c.id));
        for (const result of report.results) {
            assert.ok(ids.has(result.claimId), `result.claimId ${result.claimId} has no matching claim`);
        }
    });
    it('renders citation markers as an array', async () => {
        const report = await audit(DOC_MIXED_SECTIONS);
        for (const claim of report.claims) {
            assert.ok(Array.isArray(claim.citationMarkers), 'citationMarkers must be an array');
        }
    });
    it('exposes populated evidence metadata when a source resolved', async () => {
        // Regression guard: metadata used to be undefined on every claim,
        // so the expanded claim card was always empty.
        const report = await audit(DOC_RETRACTED);
        const resolved = report.results.filter((r) => r.existence === 'FOUND');
        assert.ok(resolved.length > 0, 'expected at least one resolved citation');
        for (const result of resolved) {
            assert.ok(result.metadata.paperTitle, 'metadata.paperTitle empty');
            assert.ok(result.metadata.source, 'metadata.source empty');
        }
    });
    it('supplies a status the widget has a colour and label for', async () => {
        const known = new Set(['SUPPORTED', 'CONTRADICTED', 'NOT_ENOUGH_EVIDENCE', 'UNRELATED', 'ERROR']);
        const report = await audit(DOC_MIXED_SECTIONS);
        for (const result of report.results) {
            assert.ok(known.has(result.status), `unrenderable status: ${result.status}`);
        }
    });
    it('supplies a severity and verdict level the widget can colour', async () => {
        const severities = new Set(['GREEN', 'AMBER', 'RED']);
        const levels = new Set(['HIGH_TRUST', 'MODERATE_TRUST', 'LOW_TRUST', 'CRITICAL']);
        const report = await audit(DOC_MIXED_SECTIONS);
        assert.ok(severities.has(report.severity));
        assert.ok(levels.has(report.verdict.level));
    });
    it('keeps confidence in [0,1] so percentage rendering is sane', async () => {
        const report = await audit(DOC_MIXED_SECTIONS);
        assert.ok(report.verdict.confidence >= 0 && report.verdict.confidence <= 1);
        for (const result of report.results) {
            assert.ok(result.confidence >= 0 && result.confidence <= 1, `confidence out of range: ${result.confidence}`);
        }
    });
    it('is JSON-serialisable for Copy JSON and Download Report', async () => {
        const report = await audit(DOC_MIXED_SECTIONS);
        const json = JSON.stringify(report);
        const parsed = JSON.parse(json);
        assert.equal(parsed.integrityScore, report.integrityScore);
        assert.equal(parsed.results.length, report.results.length);
        assert.doesNotMatch(json, /undefined/);
    });
    it('renders safely for the empty-result case', async () => {
        // The widget's filter tabs read summary.totalClaims and map over
        // results; both must exist even when nothing was extracted.
        const report = await audit('References\n\n[1] Only a bibliography here.');
        assert.ok(Array.isArray(report.results));
        assert.equal(typeof report.summary.totalClaims, 'number');
        assert.ok(report.verdict.title.length > 0);
    });
    it('keeps every claim filterable by the widget status tabs', async () => {
        const tabs = ['SUPPORTED', 'CONTRADICTED', 'NOT_ENOUGH_EVIDENCE', 'ERROR'];
        const report = await audit(DOC_UNCITED);
        for (const tab of tabs) {
            assert.doesNotThrow(() => report.results.filter((r) => r.status === tab));
        }
    });
});
//# sourceMappingURL=widget-contract.test.js.map