import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CitationExtractorService } from '../../src/modules/audit/citation-extractor.service.js';
import { ClaimExtractorService } from '../../src/modules/audit/claim-extractor.service.js';
import {
    DOC_DUPLICATE_CITATIONS,
    DOC_EMPTY,
    DOC_MALFORMED_CITATIONS,
    DOC_UNCITED,
} from '../helpers/harness.js';

const citations = new CitationExtractorService();
const claims = new ClaimExtractorService();

describe('CitationExtractorService', () => {

    it('returns nothing for empty or reference-free documents', async () => {
        assert.deepEqual(await citations.extractCitations(DOC_EMPTY), []);
        assert.deepEqual(await citations.extractCitations(DOC_UNCITED), []);
    });

    it('parses numbered entries with DOI, year and authors', async () => {
        const parsed = await citations.extractCitations(
            'Body claim about warming.\n\nReferences\n\n'
            + '[1] Hegerl, G., Zwiers, F. 2021. Attribution of observed global surface warming. '
            + 'Nature Climate Change. doi:10.1038/s41558-021-01000-0\n',
        );

        assert.equal(parsed.length, 1);
        assert.equal(parsed[0].doi, '10.1038/s41558-021-01000-0');
        assert.equal(parsed[0].year, 2021);
        assert.equal(parsed[0].resolved, false, 'parsing alone must not mark a reference resolved');
        assert.ok((parsed[0].authors ?? []).length > 0);
    });

    it('ignores ASCII divider rules used as section separators', async () => {
        const parsed = await citations.extractCitations(
            'Body claim here.\n\nReferences\n'
            + '================================================================\n\n'
            + '[1] Bailey, D. E. (2002). A Review of Telework Research.\n',
        );

        assert.equal(parsed.length, 1);
        for (const citation of parsed) {
            assert.doesNotMatch(citation.raw, /^[=\-_]+$/, 'divider became a citation');
        }
    });

    it('links numeric markers, including ranges and lists', async () => {
        const parsed = await citations.extractCitations(
            'Body.\n\nReferences\n\n[1] A. 2001. One.\n[2] B. 2002. Two.\n[3] C. 2003. Three.\n',
        );

        const { claims: linked } = citations.linkClaimsToCitations(
            [
                {
                    id: 'c1', text: 'Claim citing a range [1-3].', category: 'factual',
                    extractionConfidence: 1, context: '', paragraphIndex: 0,
                    citationMarkers: ['[1-3]'], citationIds: [],
                },
                {
                    id: 'c2', text: 'Claim citing a list [1,3].', category: 'factual',
                    extractionConfidence: 1, context: '', paragraphIndex: 0,
                    citationMarkers: ['[1,3]'], citationIds: [],
                },
            ],
            parsed,
        );

        assert.equal(linked[0].citationIds.length, 3);
        assert.equal(linked[1].citationIds.length, 2);
    });

    it('deduplicates repeated citations on one claim', async () => {
        const extracted = await claims.extractClaims(DOC_DUPLICATE_CITATIONS);
        const parsed = await citations.extractCitations(DOC_DUPLICATE_CITATIONS);
        const { claims: linked } = citations.linkClaimsToCitations(extracted, parsed);

        const repeated = linked.find((c) => c.text.includes('[1][1]'));
        assert.ok(repeated);
        assert.equal(repeated.citationIds.length, 1, 'duplicate markers must collapse to one id');
    });

    it('infers a citation from an author-year marker with no bibliography', () => {
        const { claims: linked, citations: all } = citations.linkClaimsToCitations(
            [{
                id: 'c1',
                text: 'Transformers outperform recurrence (Vaswani et al., 2017).',
                category: 'comparative', extractionConfidence: 1, context: '',
                paragraphIndex: 0, citationMarkers: ['(Vaswani et al., 2017)'], citationIds: [],
            }],
            [],
        );

        assert.equal(all.length, 1, 'expected one inferred citation');
        assert.equal(all[0].year, 2017);
        assert.deepEqual(all[0].authors, ['Vaswani']);
        assert.equal(all[0].resolved, false);
        assert.equal(linked[0].citationIds.length, 1);
    });

    it('reuses one inferred citation across repeated author-year markers', () => {
        const marker = '(Vaswani et al., 2017)';
        const mk = (id: string) => ({
            id, text: `Claim ${id} ${marker}.`, category: 'factual' as const,
            extractionConfidence: 1, context: '', paragraphIndex: 0,
            citationMarkers: [marker], citationIds: [],
        });

        const { citations: all } = citations.linkClaimsToCitations([mk('c1'), mk('c2')], []);
        assert.equal(all.length, 1, 'same work must not be inferred twice');
    });

    it('leaves numeric markers unlinked when no bibliography exists', () => {
        const { claims: linked, citations: all } = citations.linkClaimsToCitations(
            [{
                id: 'c1', text: 'A claim citing nothing resolvable [7].', category: 'factual',
                extractionConfidence: 1, context: '', paragraphIndex: 0,
                citationMarkers: ['[7]'], citationIds: [],
            }],
            [],
        );
        // "[7]" carries no author or title, so nothing can be searched for.
        assert.equal(all.length, 0);
        assert.deepEqual(linked[0].citationIds, []);
    });

    it('survives malformed citations and reference entries', async () => {
        await assert.doesNotReject(() => citations.extractCitations(DOC_MALFORMED_CITATIONS));
        const parsed = await citations.extractCitations(DOC_MALFORMED_CITATIONS);
        for (const citation of parsed) {
            assert.match(citation.raw, /[A-Za-z]{3,}/, 'punctuation-only entry became a citation');
        }
    });

    it('findInlineMarkers detects both citation styles', () => {
        const markers = CitationExtractorService.findInlineMarkers(
            'Reported widely [12] and elsewhere (Smith et al., 2020).',
        );
        assert.ok(markers.includes('[12]'));
        assert.ok(markers.some((m) => m.includes('Smith')));
    });
});
