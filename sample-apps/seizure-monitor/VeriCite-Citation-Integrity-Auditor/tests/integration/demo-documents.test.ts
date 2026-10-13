import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { audit, forceOffline, loadDemoDocuments } from '../helpers/harness.js';
import type { AuditReport } from '../../src/shared/contracts.js';

before(forceOffline);

/**
 * Demo readiness. Runs the real corpus in `Test cases/` and asserts
 * the properties a live demo depends on:
 *   - every document produces a complete, well-formed report
 *   - no phantom claims from bibliographies
 *   - outcomes are distinguishable from one another
 */
describe('demo documents (Test cases/)', () => {

    const documents = loadDemoDocuments();

    it('finds the demo corpus', () => {
        assert.ok(documents.length >= 4, `expected 4+ demo documents, found ${documents.length}`);
    });

    const reports = new Map<string, AuditReport>();

    for (const doc of documents) {
        it(`audits "${doc.name}" end to end`, async () => {
            const report = await audit(doc.text, doc.name);
            reports.set(doc.name, report);

            assert.ok(report.summary.totalClaims > 0, 'no claims extracted');
            assert.ok(report.integrityScore >= 0 && report.integrityScore <= 100);
            assert.ok(report.verdict.title.length > 0);
            assert.ok(report.verdict.reasoning.length > 0);
            assert.equal(report.results.length, report.claims.length);
            assert.equal(report.summary.errors, 0, 'offline audit should not error');
        });

        it(`extracts no bibliography phantoms from "${doc.name}"`, async () => {
            const report = reports.get(doc.name) ?? await audit(doc.text, doc.name);

            for (const claim of report.claims) {
                assert.doesNotMatch(
                    claim.text, /^\[\d+\]/,
                    `claim begins with a reference marker: ${claim.text.slice(0, 60)}`,
                );
                assert.doesNotMatch(
                    claim.text, /^[=\-_]{3,}/,
                    `claim is a divider rule: ${claim.text.slice(0, 60)}`,
                );
            }
        });
    }

    it('produces distinguishable outcomes across the corpus', async () => {
        for (const doc of documents) {
            if (!reports.has(doc.name)) reports.set(doc.name, await audit(doc.text, doc.name));
        }

        const fingerprints = [...reports.values()].map(
            (r) => `${r.integrityScore}|${r.severity}|${r.verdict.level}|${r.summary.totalClaims}`,
        );

        assert.equal(
            new Set(fingerprints).size, fingerprints.length,
            `demo outcomes are not distinct:\n${fingerprints.join('\n')}`,
        );
    });

    it('links claims to citations wherever the document cites anything', async () => {
        for (const doc of documents) {
            const report = reports.get(doc.name) ?? await audit(doc.text, doc.name);
            const withMarkers = report.claims.filter((c) => c.citationMarkers.length > 0);

            if (withMarkers.length === 0) continue;

            const linked = withMarkers.filter((c) => c.citationIds.length > 0);
            assert.ok(
                linked.length > 0,
                `"${doc.name}": ${withMarkers.length} claims carry markers but none linked to a citation`,
            );
        }
    });
});
