// src/shared/document-segmenter.ts
/**
 * ============================================================
 * VeriCite — Document Segmenter
 * ------------------------------------------------------------
 * Single source of truth for "where does the paper's argument
 * end and its apparatus begin".
 *
 * WHY THIS EXISTS (P0-1 root cause)
 *
 * ClaimExtractorService used to do this before splitting:
 *
 *     text.replace(/\n+/g, ' ')      // collapse ALL newlines
 *         .split(/(?<=[.!?])\s+/)    // then split sentences
 *
 * Collapsing newlines destroys paragraph and section boundaries,
 * so the anchored guards that were supposed to skip the reference
 * list (`/^\[\d+\]/`, `/^references$/i`) could never match — the
 * bibliography was no longer at the start of anything. Measured
 * on a 2-sentence body with a 2-entry reference list: 7 claims
 * extracted, 5 of them phantoms harvested from the bibliography.
 *
 * Because every phantom is uncited, they inflated
 * `summary.missingCitation`, collapsed `citationCoverage`, and
 * triggered a near-maximum coverage penalty — roughly 39 points
 * off Document A.
 *
 * The fix is structural, not a post-extraction filter: segment the
 * document FIRST, and never hand the apparatus to the claim
 * extractor at all.
 *
 * PURE · DETERMINISTIC · NO I/O
 * ============================================================
 */
/* ------------------------------------------------------------
 * Section headings
 * ---------------------------------------------------------- */
/**
 * Headings that begin the reference list. Line-anchored: a heading
 * occupies its own line, optionally decorated with markdown hashes,
 * numbering, or a trailing colon.
 */
const REFERENCE_HEADING_SOURCE = String.raw `^[ \t]*(?:#{1,6}[ \t]*)?(?:\d+[.)][ \t]*)?(?:references|bibliography|works[ \t]+cited|literature[ \t]+cited|reference[ \t]+list)[ \t]*:?[ \t]*$`;
/**
 * Headings for back-matter that is not the paper's argument either.
 * Claims must not be harvested from these any more than from the
 * bibliography.
 */
const TERMINAL_HEADING_SOURCE = String.raw `^[ \t]*(?:#{1,6}[ \t]*)?(?:\d+[.)][ \t]*)?(?:appendix(?:[ \t]+[a-z0-9]+)?|appendices|acknowledgements?|acknowledgments?|author[ \t]+contributions?|funding(?:[ \t]+statement)?|supplementary(?:[ \t]+(?:material|information))?|conflicts?[ \t]+of[ \t]+interest|declarations?[ \t]+of[ \t]+interest|competing[ \t]+interests?|data[ \t]+availability(?:[ \t]+statement)?|ethics[ \t]+(?:statement|approval))[ \t]*:?[ \t]*$`;
const REFERENCE_HEADING = new RegExp(REFERENCE_HEADING_SOURCE, 'gim');
const TERMINAL_HEADING = new RegExp(TERMINAL_HEADING_SOURCE, 'gim');
/* ------------------------------------------------------------
 * Non-content block patterns (paragraph level)
 * ---------------------------------------------------------- */
/** Figure/table/equation captions carry no auditable assertion. */
const CAPTION_BLOCK = /^(?:figure|fig\.?|table|tbl\.?|chart|exhibit|scheme|equation|eq\.?|algorithm|listing|appendix)\s*\.?\s*\d+/i;
/** Bare page numbers, running heads, and stray reference numbering. */
const NOISE_BLOCK = /^(?:\d{1,4}|[ivxlcdm]{1,7}|\[\d{1,3}\]|page\s+\d+(?:\s+of\s+\d+)?)$/i;
/** A leftover reference entry that escaped section detection. */
const REFERENCE_ENTRY_BLOCK = /^\s*(?:\[\d{1,3}\]|\d{1,3}[.)])\s+\S/;
/** Section headings appearing inline without their own blank line. */
const KNOWN_HEADING_WORDS = /^(?:abstract|introduction|background|related\s+work|methods?|methodology|materials(?:\s+and\s+methods)?|results?|discussion|conclusions?|limitations?|future\s+work|summary|keywords?|contents?|index)\s*:?$/i;
/* ------------------------------------------------------------
 * Sentence splitting
 * ---------------------------------------------------------- */
/**
 * Abbreviations whose trailing period must not end a sentence.
 * Masked before splitting and restored afterwards — more reliable
 * than an ever-growing lookbehind.
 */
const ABBREVIATIONS = [
    'et al.', 'e.g.', 'i.e.', 'cf.', 'vs.', 'etc.', 'approx.', 'ca.',
    'Fig.', 'Figs.', 'Tab.', 'Eq.', 'Eqs.', 'Ref.', 'Refs.', 'No.', 'Nos.',
    'pp.', 'p.', 'Vol.', 'vol.', 'ed.', 'eds.', 'Dr.', 'Prof.', 'Mr.', 'Mrs.',
    'Ms.', 'St.', 'Inc.', 'Ltd.', 'Jr.', 'Sr.', 'Ph.D.', 'M.D.', 'U.S.', 'U.K.',
];
/** Control char standing in for a masked period. Never appears in real prose. */
const PERIOD_SENTINEL = '\u0001';
/** Split after terminal punctuation only when a new sentence plausibly starts. */
const SENTENCE_BOUNDARY = /(?<=[.!?])["'”’)\]]?\s+(?=["'“‘(\[]?[A-Z0-9])/;
/** Minimum characters for a fragment to be considered a sentence. */
const MIN_SENTENCE_LENGTH = 11;
/* ============================================================
 * Segmentation
 * ============================================================ */
/** Normalise line endings so CRLF documents segment identically to LF ones. */
export function normaliseLineEndings(text) {
    return text.replace(/\r\n?/g, '\n');
}
function findHeadings(text) {
    const found = [];
    REFERENCE_HEADING.lastIndex = 0;
    for (const match of text.matchAll(REFERENCE_HEADING)) {
        if (match.index === undefined)
            continue;
        found.push({ index: match.index, end: match.index + match[0].length, kind: 'references' });
    }
    TERMINAL_HEADING.lastIndex = 0;
    for (const match of text.matchAll(TERMINAL_HEADING)) {
        if (match.index === undefined)
            continue;
        found.push({ index: match.index, end: match.index + match[0].length, kind: 'terminal' });
    }
    return found.sort((a, b) => a.index - b.index);
}
/**
 * Split a document into its argument body and its reference list.
 *
 * The body stops at the FIRST back-matter heading of any kind, so
 * appendices and acknowledgements are excluded from claim extraction
 * alongside the bibliography. The reference list is taken from the
 * first `references` heading up to the next heading after it.
 */
export function segmentDocument(text) {
    if (typeof text !== 'string' || text.trim().length === 0) {
        return { body: '', references: null };
    }
    const normalised = normaliseLineEndings(text);
    const headings = findHeadings(normalised);
    if (headings.length === 0) {
        return { body: normalised.trim(), references: null };
    }
    // Body ends at the first back-matter heading of any kind.
    const body = normalised.slice(0, headings[0].index).trim();
    const referenceHeading = headings.find((h) => h.kind === 'references');
    if (!referenceHeading) {
        return { body, references: null };
    }
    const next = headings.find((h) => h.index > referenceHeading.index);
    const references = normalised
        .slice(referenceHeading.end, next ? next.index : undefined)
        .trim();
    return { body, references: references.length > 0 ? references : null };
}
/* ============================================================
 * Paragraph handling
 * ============================================================ */
/**
 * Split body text into paragraphs, unwrapping soft line breaks.
 *
 * Blank lines separate paragraphs. Single newlines inside a
 * paragraph are PDF/word-wrap artefacts and are joined with a
 * space — but crucially the paragraph boundary itself survives,
 * which is what the previous global `\n+ -> ' '` collapse destroyed.
 */
export function splitParagraphs(body) {
    if (typeof body !== 'string' || body.trim().length === 0)
        return [];
    return normaliseLineEndings(body)
        .split(/\n[ \t]*\n+/)
        .map((block) => block.replace(/\n+/g, ' ').replace(/[ \t]+/g, ' ').trim())
        .filter((block) => block.length > 0);
}
/** True when a paragraph is apparatus rather than prose. */
export function isNonContentBlock(block) {
    const trimmed = block.trim();
    if (trimmed.length === 0)
        return true;
    if (NOISE_BLOCK.test(trimmed))
        return true;
    if (CAPTION_BLOCK.test(trimmed))
        return true;
    if (REFERENCE_ENTRY_BLOCK.test(trimmed))
        return true;
    if (KNOWN_HEADING_WORDS.test(trimmed))
        return true;
    // Short, unpunctuated lines are section headings, not assertions.
    const endsLikeSentence = /[.!?]["'”’)\]]?$/.test(trimmed);
    if (!endsLikeSentence && trimmed.length < 80 && !trimmed.includes(',')) {
        return true;
    }
    return false;
}
/* ============================================================
 * Sentence handling
 * ============================================================ */
function maskAbbreviations(text) {
    let masked = text;
    for (const abbreviation of ABBREVIATIONS) {
        masked = masked.split(abbreviation).join(abbreviation.replace(/\./g, PERIOD_SENTINEL));
    }
    // Initials such as "Smith, J. R." must not end a sentence either.
    return masked.replace(/\b([A-Z])\.(?=\s|$)/g, `$1${PERIOD_SENTINEL}`);
}
function unmaskAbbreviations(text) {
    return text.split(PERIOD_SENTINEL).join('.');
}
/** Split one paragraph into sentences, respecting abbreviations. */
export function splitSentences(paragraph) {
    if (typeof paragraph !== 'string' || paragraph.trim().length === 0)
        return [];
    return maskAbbreviations(paragraph)
        .split(SENTENCE_BOUNDARY)
        .map((sentence) => unmaskAbbreviations(sentence).trim())
        .filter((sentence) => sentence.length >= MIN_SENTENCE_LENGTH);
}
/**
 * Body text -> ordered sentences with their paragraph of origin.
 * Apparatus blocks are dropped before sentence splitting, so no
 * caption or heading fragment can ever reach the claim classifier.
 */
export function extractBodySentences(body) {
    const sentences = [];
    const paragraphs = splitParagraphs(body);
    paragraphs.forEach((paragraph, paragraphIndex) => {
        if (isNonContentBlock(paragraph))
            return;
        for (const text of splitSentences(paragraph)) {
            sentences.push({ text, paragraphIndex });
        }
    });
    return sentences;
}
//# sourceMappingURL=document-segmenter.js.map