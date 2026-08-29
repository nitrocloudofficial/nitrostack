import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ContradictionAnalyzer } from '../../src/modules/audit/contradiction.analyzer.js';
import { OfflineVerificationService } from '../../src/modules/verification/offline-verification.service.js';
import { CitationVerificationService } from '../../src/modules/verification/citation-verification.service.js';
import {
    toCanonicalResult,
    toEvidenceRecord,
    uncitedResult,
} from '../../src/modules/verification/verification.adapter.js';
import { politeUserAgent, resolveContactEmail } from '../../src/modules/verification/utils/contact.js';
import type { EngineVerificationResult } from '../../src/modules/verification/types.js';
import type { Citation, Claim } from '../../src/shared/contracts.js';

function claim(text: string, citationIds: string[] = []): Claim {
    return {
        id: 'c1', text, category: 'factual', extractionConfidence: 1,
        context: '', paragraphIndex: 0, citationMarkers: [], citationIds,
    };
}

function engineResult(over: Partial<EngineVerificationResult> = {}): EngineVerificationResult {
    return {
        claimId: 'c1', citationId: 'cit_1', existence: 'FOUND', status: 'SUPPORTED',
        confidence: 0.8, reason: 'because', verifiedSources: ['Crossref'],
        retracted: false, metadata: { source: 'Crossref', paperTitle: 'A paper' },
        ...over,
    };
}

describe('ContradictionAnalyzer', () => {

    it('detects explicit negation of the claim', () => {
        const a = ContradictionAnalyzer.analyze(
            claim('Vaccination causes autism in children.'),
            {
                title: 'Measles vaccination and autism risk cohort study',
                abstract: 'In a nationwide cohort of children we found no evidence that measles '
                    + 'vaccination increases the risk of autism. The study does not support a causal link.',
            },
        );
        assert.equal(a.stance, 'CONTRADICTING');
    });

    it('detects directional polarity conflict', () => {
        const a = ContradictionAnalyzer.analyze(
            claim('Antibiotic resistance in bacteria decreased across all pathogens.'),
            {
                title: 'Global burden of bacterial antimicrobial resistance',
                abstract: 'Antimicrobial resistance in bacteria increased across most pathogen '
                    + 'combinations examined, and the burden was highest in low-resource settings.',
            },
        );
        assert.equal(a.stance, 'CONTRADICTING');
    });

    it('treats a retracted source as contradicting regardless of abstract', () => {
        const a = ContradictionAnalyzer.analyze(
            claim('Vaccination causes autism in children.'),
            { title: 'Ileal-lymphoid-nodular hyperplasia in children', abstract: 'Association proposed.', retracted: true },
        );
        assert.equal(a.stance, 'CONTRADICTING');
        assert.match(a.reason, /RETRACTED/);
    });

    it('supports a genuinely on-topic abstract', () => {
        const a = ContradictionAnalyzer.analyze(
            claim('Global surface temperature increased due to greenhouse gas emissions.'),
            {
                title: 'Attribution of observed global surface warming',
                abstract: 'Observed global surface temperature increased substantially. The increase '
                    + 'is dominated by anthropogenic greenhouse gas emissions.',
            },
        );
        assert.equal(a.stance, 'SUPPORTING');
    });

    it('stays NEUTRAL on off-topic evidence rather than guessing', () => {
        const a = ContradictionAnalyzer.analyze(
            claim('Global surface temperature increased due to greenhouse emissions.'),
            { title: 'Baroque harpsichord tuning conventions', abstract: 'Discussion of temperament systems.' },
        );
        assert.equal(a.stance, 'NEUTRAL');
    });

    it('does not read an unrelated null finding as refuting the claim', () => {
        const a = ContradictionAnalyzer.analyze(
            claim('Ice sheet mass loss contributes to sea level rise.'),
            {
                title: 'Ice sheet mass balance observations',
                abstract: 'Ice sheet mass loss raised sea level. Separately, we found no evidence '
                    + 'of instrument drift in the calibration subsystem.',
            },
        );
        assert.notEqual(a.stance, 'CONTRADICTING');
    });

    it('is deterministic', () => {
        const input = { title: 'T', abstract: 'Temperature increased due to emissions.' };
        assert.deepEqual(
            ContradictionAnalyzer.analyze(claim('Temperature increased due to emissions.'), input),
            ContradictionAnalyzer.analyze(claim('Temperature increased due to emissions.'), input),
        );
    });
});

describe('verification.adapter', () => {

    it('reports an uncited claim as UNRELATED, not NOT_ENOUGH_EVIDENCE', () => {
        const r = uncitedResult(claim('An uncited assertion.'));
        assert.equal(r.status, 'UNRELATED');
        assert.equal(r.existence, 'NOT_FOUND');
        assert.match(r.reason, /no citation marker/i);
    });

    it('lets a contradiction outrank support from sibling citations', () => {
        const r = toCanonicalResult(claim('x', ['a', 'b']), [
            engineResult({ citationId: 'a', status: 'SUPPORTED', confidence: 0.95 }),
            engineResult({ citationId: 'b', status: 'CONTRADICTED', confidence: 0.6 }),
        ]);
        assert.equal(r.status, 'CONTRADICTED');
        assert.equal(r.supportingEvidence.length, 1);
        assert.equal(r.contradictingEvidence.length, 1);
        assert.deepEqual(r.citationIds, ['a', 'b']);
    });

    it('ranks existence FOUND over AMBIGUOUS over NOT_FOUND', () => {
        const r = toCanonicalResult(claim('x', ['a', 'b']), [
            engineResult({ citationId: 'a', existence: 'NOT_FOUND', status: 'NOT_ENOUGH_EVIDENCE' }),
            engineResult({ citationId: 'b', existence: 'FOUND', status: 'NOT_ENOUGH_EVIDENCE' }),
        ]);
        assert.equal(r.existence, 'FOUND');
    });

    it('does not let a single ERROR mask a sibling verdict', () => {
        const r = toCanonicalResult(claim('x', ['a', 'b']), [
            engineResult({ citationId: 'a', status: 'ERROR', confidence: 0 }),
            engineResult({ citationId: 'b', status: 'SUPPORTED', confidence: 0.9 }),
        ]);
        assert.equal(r.status, 'SUPPORTED');
    });

    it('surfaces metadata from the decisive result', () => {
        const r = toCanonicalResult(claim('x', ['a']), [
            engineResult({ metadata: { source: 'OpenAlex', paperTitle: 'Decisive', doi: '10.1/x' } }),
        ]);
        assert.equal(r.metadata.paperTitle, 'Decisive');
        assert.equal(r.metadata.doi, '10.1/x');
    });

    it('maps engine status onto evidence stance', () => {
        assert.equal(toEvidenceRecord(engineResult({ status: 'SUPPORTED' })).stance, 'SUPPORTING');
        assert.equal(toEvidenceRecord(engineResult({ status: 'CONTRADICTED' })).stance, 'CONTRADICTING');
        assert.equal(toEvidenceRecord(engineResult({ status: 'NOT_ENOUGH_EVIDENCE' })).stance, 'NEUTRAL');
    });
});

describe('OfflineVerificationService', () => {
    const offline = new OfflineVerificationService();
    const cite = (over: Partial<Citation> = {}): Citation =>
        ({ id: 'cit_1', raw: 'raw', marker: '[1]', resolved: false, ...over });

    it('resolves a fixture by DOI', async () => {
        const r = await offline.verifyCitation(
            claim('Global temperature increased due to greenhouse gas emissions.'),
            cite({ doi: '10.1038/s41558-021-01000-0' }),
        );
        assert.equal(r.existence, 'FOUND');
        assert.equal(r.metadata.source, 'Fixture');
        assert.ok(r.evidence);
    });

    it('flags a retracted fixture as CONTRADICTED', async () => {
        const r = await offline.verifyCitation(
            claim('Vaccination causes autism.'),
            cite({ doi: '10.1016/S0140-6736(97)11096-0' }),
        );
        assert.equal(r.retracted, true);
        assert.equal(r.status, 'CONTRADICTED');
    });

    it('reports NOT_FOUND for a fake reference rather than inventing a match', async () => {
        const r = await offline.verifyCitation(
            claim('Quantum entanglement enables faster-than-light communication.'),
            cite({ doi: '10.9999/not-a-real-doi-99999', raw: 'A Paper That Was Never Written' }),
        );
        assert.equal(r.existence, 'NOT_FOUND');
        assert.equal(r.verifiedSources.length, 0);
        assert.equal(r.metadata.paperTitle, undefined);
    });
});

describe('CitationVerificationService', () => {

    it('reports offline mode from the environment', () => {
        const previous = process.env['VERICITE_OFFLINE'];
        process.env['VERICITE_OFFLINE'] = 'true';
        assert.equal(new CitationVerificationService(new OfflineVerificationService()).isOffline(), true);
        process.env['VERICITE_OFFLINE'] = previous;
    });

    it('short-circuits uncited claims without any provider call', async () => {
        const svc = new CitationVerificationService(new OfflineVerificationService());
        const { result, resolutions } = await svc.verifyClaimWithResolutions(claim('Uncited.'), []);
        assert.equal(result.status, 'UNRELATED');
        assert.deepEqual(resolutions, []);
    });
});

describe('contact / User-Agent construction', () => {
    const withEnv = <T>(value: string | undefined, fn: () => T): T => {
        const prevContact = process.env['CONTACT_EMAIL'];
        const prevAlex = process.env['OPENALEX_EMAIL'];
        delete process.env['OPENALEX_EMAIL'];
        if (value === undefined) delete process.env['CONTACT_EMAIL'];
        else process.env['CONTACT_EMAIL'] = value;
        try { return fn(); } finally {
            if (prevContact === undefined) delete process.env['CONTACT_EMAIL'];
            else process.env['CONTACT_EMAIL'] = prevContact;
            if (prevAlex !== undefined) process.env['OPENALEX_EMAIL'] = prevAlex;
        }
    };

    it('strips the CR that a CRLF .env injects', () => {
        // This exact defect made Crossref fail on 100% of requests:
        // "Invalid character in header content [User-Agent]".
        const ua = withEnv('real.person@university.edu\r', politeUserAgent);
        assert.doesNotMatch(ua, /[\r\n]/);
        assert.match(ua, /real\.person@university\.edu/);
    });

    it('rejects placeholder addresses instead of sending them', () => {
        for (const placeholder of ['your_email@domain.com', 'vericite@example.com', 'user@test.com']) {
            assert.equal(withEnv(placeholder, resolveContactEmail), null, placeholder);
        }
    });

    it('omits mailto entirely when nothing valid is configured', () => {
        const ua = withEnv(undefined, politeUserAgent);
        assert.doesNotMatch(ua, /mailto/);
        assert.match(ua, /VeriCite/);
    });

    it('accepts a real address', () => {
        assert.equal(withEnv('a.researcher@cam.ac.uk', resolveContactEmail), 'a.researcher@cam.ac.uk');
    });
});
