import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    extractBodySentences,
    isNonContentBlock,
    segmentDocument,
    splitParagraphs,
    splitSentences,
} from '../../src/shared/document-segmenter.js';

describe('document-segmenter', () => {

    describe('segmentDocument', () => {
        it('returns empty segments for empty input', () => {
            assert.deepEqual(segmentDocument(''), { body: '', references: null });
            assert.deepEqual(segmentDocument('   \n  '), { body: '', references: null });
        });

        it('splits body from a References section', () => {
            const { body, references } = segmentDocument(
                'A claim about warming.\n\nReferences\n\n[1] Smith 2020. A paper.',
            );
            assert.match(body, /A claim about warming/);
            assert.doesNotMatch(body, /Smith/);
            assert.match(references ?? '', /Smith 2020/);
        });

        it('recognises Bibliography and Works Cited', () => {
            for (const heading of ['Bibliography', 'Works Cited', 'REFERENCES', '## References']) {
                const { references } = segmentDocument(`Body claim here.\n\n${heading}\n\n[1] Entry.`);
                assert.ok(references, `heading not recognised: ${heading}`);
            }
        });

        it('stops the body at back matter even when it precedes the references', () => {
            const { body, references } = segmentDocument(
                'Body claim.\n\nAcknowledgements\n\nWe thank people.\n\nReferences\n\n[1] Entry here.',
            );
            assert.doesNotMatch(body, /thank people/);
            assert.match(references ?? '', /Entry here/);
        });

        it('does not treat an inline mention of references as a heading', () => {
            const { references } = segmentDocument(
                'We compared our references with prior work in the field.',
            );
            assert.equal(references, null);
        });

        it('normalises CRLF so segmentation is identical', () => {
            const lf = segmentDocument('Claim one.\n\nReferences\n\n[1] Entry text.');
            const crlf = segmentDocument('Claim one.\r\n\r\nReferences\r\n\r\n[1] Entry text.');
            assert.deepEqual(crlf, lf);
        });
    });

    describe('splitParagraphs', () => {
        it('preserves paragraph boundaries and unwraps soft breaks', () => {
            const paragraphs = splitParagraphs('One sentence\nwrapped over lines.\n\nSecond paragraph.');
            assert.equal(paragraphs.length, 2);
            assert.equal(paragraphs[0], 'One sentence wrapped over lines.');
        });
    });

    describe('isNonContentBlock', () => {
        it('rejects captions, page numbers, headings and reference entries', () => {
            for (const block of [
                'Figure 1. Global temperature anomaly.',
                'Table 2. Regional rates.',
                '42',
                'Introduction',
                'Methods',
                '[3] Smith, J. 2020. A paper title.',
            ]) {
                assert.equal(isNonContentBlock(block), true, `should reject: ${block}`);
            }
        });

        it('accepts ordinary prose', () => {
            assert.equal(
                isNonContentBlock('Global mean surface temperature has increased substantially.'),
                false,
            );
        });
    });

    describe('splitSentences', () => {
        it('does not split on common abbreviations', () => {
            const sentences = splitSentences(
                'Vaswani et al. showed strong results. The effect held e.g. in translation.',
            );
            assert.equal(sentences.length, 2);
            assert.match(sentences[0], /et al\. showed/);
        });

        it('does not split on author initials', () => {
            const sentences = splitSentences('Reported by Smith, J. R. in a later study of the topic.');
            assert.equal(sentences.length, 1);
        });
    });

    describe('extractBodySentences', () => {
        it('reports the paragraph each sentence came from', () => {
            const sentences = extractBodySentences(
                'First claim sentence here. Second in same paragraph.\n\nThird claim in a new paragraph.',
            );
            assert.equal(sentences.length, 3);
            assert.equal(sentences[0].paragraphIndex, 0);
            assert.equal(sentences[1].paragraphIndex, 0);
            assert.equal(sentences[2].paragraphIndex, 1);
        });
    });
});
