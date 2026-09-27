// src/modules/audit/citation-extractor.service.ts

/**
 * ============================================================
 * VeriCite — Citation Extractor
 * ------------------------------------------------------------
 * Implements the citation-extraction stage that was previously
 * absent. Before this service existed the orchestrator called
 * `AuditMapper.mapCitations(undefined)`, so `AuditReport.citations`
 * was permanently `[]` and `summary.missingCitation` could only be
 * derived from a placeholder. Both are now computed from real
 * parsed references.
 *
 * Responsibilities:
 *   1. Locate the reference / bibliography section.
 *   2. Parse it into canonical `Citation` objects.
 *   3. Resolve each claim's inline markers to citation ids.
 *
 * Supports the two dominant academic citation styles:
 *   • Numeric   — "[12]" / "12." referencing an ordered list
 *   • Author-year (Harvard/APA) — "(Smith et al., 2020)"
 *
 * PURE: no network, no async I/O. Deterministic for a given input.
 * ============================================================
 */

import { Injectable } from '@nitrostack/core';
import type {
    Citation,
    Claim,
    ICitationExtractionService,
} from '../../shared/contracts.js';
import { segmentDocument } from '../../shared/document-segmenter.js';

/* ------------------------------------------------------------
 * Entry recognition
 * ------------------------------------------------------------
 * Section detection lives in shared/document-segmenter.ts. This
 * service previously carried its own REFERENCE_HEADING and
 * TRAILING_SECTION_HEADING patterns — a second, subtly different
 * definition of where the bibliography starts. They are gone: the
 * claim extractor and this service now agree by construction.
 * ---------------------------------------------------------- */

/** "[12] " or "12. " at the start of a reference entry. */
const NUMBERED_ENTRY = /^\s*(?:\[(\d{1,3})\]|(\d{1,3})[.)])\s+(.*)$/;

/**
 * ASCII rules used as section dividers in plain-text papers.
 * Without this they survive entry splitting and become "citations"
 * whose raw text is a row of equals signs.
 */
const SEPARATOR_LINE = /^[=\-_*~#·—–]{3,}$/;

/** A parsed entry must contain some actual words to be a reference. */
const HAS_WORDS = /[A-Za-z]{3,}/;

/** Filler words that add no retrieval signal to an inferred citation query. */
const INFERENCE_STOP_WORDS = new Set([
    'this', 'that', 'these', 'those', 'have', 'with', 'from', 'were', 'been',
    'their', 'which', 'while', 'about', 'other', 'such', 'than',
    'then', 'they', 'them', 'when', 'where', 'because', 'however', 'therefore',
    'reported', 'showed', 'demonstrated', 'found', 'suggests', 'suggest',
    'study', 'studies', 'paper', 'work', 'results', 'result',
]);

const DOI_PATTERN = /\b(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\b/i;
const YEAR_PATTERN = /\b(1[89]\d{2}|20\d{2})\b/;
const URL_PATTERN = /\bhttps?:\/\/[^\s,;)]+/i;

/** Inline numeric markers: [3], [3,4], [3-5]. */
const INLINE_NUMERIC_MARKER = /\[(\d{1,3}(?:\s*[,–—-]\s*\d{1,3})*)\]/g;

/**
 * Inline author-year markers.
 *
 * Handles the full range of real forms:
 *   (Smith, 2020)
 *   (Smith et al., 2020)
 *   (Smith & Jones, 2020)
 *   (Devlin et al., 2018; Liu et al., 2019)   -> matches each
 *
 * The previous pattern required a SECOND capitalised surname after
 * "et al.", so the single most common academic citation form —
 * "(Vaswani et al., 2017)" — never matched. Every author-year
 * document therefore looked entirely uncited.
 */
const INLINE_AUTHOR_YEAR_MARKER =
    /\(\s*([A-Z][A-Za-z'’\-]+)[^()]{0,60}?[,;\s]\s*((?:1[89]|20)\d{2})[a-z]?\s*\)/g;

@Injectable()
export class CitationExtractorService implements ICitationExtractionService {

    /* ==========================================================
     * Public: parse the reference list
     * ========================================================== */

    async extractCitations(documentText: string): Promise<Citation[]> {
        if (typeof documentText !== 'string' || documentText.trim().length === 0) {
            return [];
        }

        const { references } = segmentDocument(documentText);
        if (!references) return [];

        const entries = this.splitEntries(references);

        return entries.map((entry, index) =>
            this.parseEntry(entry.raw, entry.ordinal ?? index + 1, index),
        );
    }

    /* ==========================================================
     * Public: link claims to citations
     * ========================================================== */

    /**
     * Resolve each claim's inline markers to citation ids.
     *
     * Returns BOTH the linked claims and the citation list, because
     * linking can discover new citations: an author-year marker such
     * as "(Vaswani et al., 2017)" that matches no reference-list entry
     * still identifies a real work. Many papers — including two of the
     * four documents in `Test cases/` — cite entirely inline and ship
     * no bibliography at all. Treating those claims as uncited would
     * be wrong: the author DID cite a source, and "Vaswani 2017" is
     * enough for the verification engine to search on.
     *
     * Inferred citations are marked `resolved: false` until a provider
     * confirms them, exactly like parsed ones. Numeric markers with no
     * reference list stay unlinked — "[3]" carries no information a
     * provider could search for.
     */
    linkClaimsToCitations(
        claims: Claim[],
        citations: Citation[],
    ): { claims: Claim[]; citations: Citation[] } {
        if (!Array.isArray(claims) || claims.length === 0) {
            return { claims: [], citations: Array.isArray(citations) ? citations : [] };
        }

        const known = Array.isArray(citations) ? [...citations] : [];

        const byOrdinal = new Map<number, string>();
        const byAuthorYear = new Map<string, string>();

        known.forEach((citation, index) => {
            byOrdinal.set(index + 1, citation.id);

            const surname = this.primarySurname(citation.authors);
            if (surname && citation.year) {
                byAuthorYear.set(this.authorYearKey(surname, citation.year), citation.id);
            }
        });

        let inferredCount = 0;

        const linked = claims.map((claim) => {
            const ids = new Set<string>();

            for (const marker of claim.citationMarkers ?? []) {
                for (const ordinal of this.expandNumericMarker(marker)) {
                    const id = byOrdinal.get(ordinal);
                    if (id) ids.add(id);
                }

                const parsed = this.parseAuthorYear(marker);
                if (!parsed) continue;

                const key = this.authorYearKey(parsed.surname, parsed.year);
                const existing = byAuthorYear.get(key);

                if (existing) {
                    ids.add(existing);
                    continue;
                }

                // Inline citation with no matching reference entry.
                //
                // "Vaswani (2017)" alone is far too thin a bibliographic
                // search string — measured live, it matched unrelated works
                // ("Art and Merchandise in Keith Haring's Pop Shop") because
                // Crossref had nothing topical to rank on. Seeding the raw
                // string with the citing sentence's content words gives the
                // provider real signal while keeping the query anchored to
                // the named author and year.
                const inferred: Citation = {
                    id: `cit_inferred_${++inferredCount}`,
                    raw: this.inferredSearchString(parsed.surname, parsed.year, claim.text),
                    marker,
                    authors: [parsed.surname],
                    year: parsed.year,
                    resolved: false,
                };

                known.push(inferred);
                byAuthorYear.set(key, inferred.id);
                ids.add(inferred.id);
            }

            return { ...claim, citationIds: Array.from(ids) };
        });

        return { claims: linked, citations: known };
    }

    /* ==========================================================
     * Public: marker discovery (used by the claim extractor)
     * ========================================================== */

    /** Extract every inline citation marker from a sentence. */
    static findInlineMarkers(sentence: string): string[] {
        if (typeof sentence !== 'string') return [];

        const markers: string[] = [];

        for (const match of sentence.matchAll(INLINE_NUMERIC_MARKER)) {
            markers.push(match[0]);
        }

        for (const match of sentence.matchAll(INLINE_AUTHOR_YEAR_MARKER)) {
            markers.push(match[0]);
        }

        return Array.from(new Set(markers));
    }

    /* ==========================================================
     * Private: entry splitting
     * ========================================================== */

    private splitEntries(block: string): Array<{ raw: string; ordinal?: number }> {
        const lines = block.split('\n');
        const entries: Array<{ raw: string; ordinal?: number }> = [];

        let current: string[] = [];
        let currentOrdinal: number | undefined;

        const flush = (): void => {
            const raw = current.join(' ').replace(/\s+/g, ' ').trim();
            if (raw.length >= 10 && HAS_WORDS.test(raw)) {
                entries.push({ raw, ordinal: currentOrdinal });
            }
            current = [];
            currentOrdinal = undefined;
        };

        for (const line of lines) {
            const trimmed = line.trim();

            // Divider rules belong to no entry and must not start one.
            if (SEPARATOR_LINE.test(trimmed)) continue;

            if (trimmed.length === 0) {
                // Blank line separates entries in unnumbered styles.
                if (current.length > 0) flush();
                continue;
            }

            const numbered = NUMBERED_ENTRY.exec(trimmed);

            if (numbered) {
                if (current.length > 0) flush();
                currentOrdinal = Number(numbered[1] ?? numbered[2]);
                current.push(numbered[3] ?? '');
                continue;
            }

            // Continuation of a wrapped entry.
            current.push(trimmed);
        }

        if (current.length > 0) flush();

        return entries;
    }

    /* ==========================================================
     * Private: entry parsing
     * ========================================================== */

    private parseEntry(raw: string, ordinal: number, index: number): Citation {
        const doi = DOI_PATTERN.exec(raw)?.[1];
        const url = URL_PATTERN.exec(raw)?.[0];
        const yearMatch = YEAR_PATTERN.exec(raw);
        const year = yearMatch ? Number(yearMatch[1]) : undefined;

        const authors = this.parseAuthors(raw);
        const title = this.parseTitle(raw, year);
        const journal = this.parseJournal(raw, title);

        const surname = this.primarySurname(authors);
        const marker =
            surname && year
                ? `(${surname}, ${year})`
                : `[${ordinal}]`;

        return {
            id: `cit_${index + 1}`,
            raw,
            marker,
            title,
            authors: authors.length > 0 ? authors : undefined,
            journal,
            year,
            doi: doi ? doi.replace(/[.,;]+$/, '') : undefined,
            url,
            // Resolution is a network concern, performed later by the
            // scholarly service. Parsing alone proves nothing exists.
            resolved: false,
        };
    }

    /**
     * Authors are the text before the first year or the first sentence
     * terminator, whichever comes first. Handles "Smith, J., Jones, K."
     * and "Smith J, Jones K" forms.
     */
    private parseAuthors(raw: string): string[] {
        const yearIndex = raw.search(YEAR_PATTERN);
        const head = yearIndex > 0 ? raw.slice(0, yearIndex) : raw.split('.')[0] ?? '';

        const cleaned = head.replace(/\(\s*$/, '').replace(/\s+/g, ' ').trim();
        if (cleaned.length === 0) return [];

        return cleaned
            .split(/\s*(?:,|;|&|\band\b)\s*/)
            .map((part) => part.replace(/[.\s]+$/, '').trim())
            // Drop initials-only fragments left over from "Smith, J."
            .filter((part) => /[A-Za-z]{2,}/.test(part))
            .filter((part) => part.length > 1 && part.length < 60)
            .slice(0, 12);
    }

    /**
     * Title is the segment following the year, or the second
     * sentence-delimited segment when no year is present.
     */
    private parseTitle(raw: string, year?: number): string | undefined {
        let tail = raw;

        if (year !== undefined) {
            const marker = String(year);
            const at = raw.indexOf(marker);
            if (at >= 0) {
                tail = raw.slice(at + marker.length);
            }
        }

        const candidate = tail
            .replace(/^[\s).,;:]+/, '')
            .split(/\.\s+/)[0]
            ?.replace(/[.,;:\s]+$/, '')
            .trim();

        if (!candidate || candidate.length < 8 || candidate.length > 300) {
            return undefined;
        }

        return candidate;
    }

    /** Journal is the segment immediately after the title. */
    private parseJournal(raw: string, title?: string): string | undefined {
        if (!title) return undefined;

        const at = raw.indexOf(title);
        if (at < 0) return undefined;

        const candidate = raw
            .slice(at + title.length)
            .replace(/^[\s).,;:]+/, '')
            .split(/[.,;]\s/)[0]
            ?.trim();

        if (!candidate || candidate.length < 3 || candidate.length > 120) {
            return undefined;
        }

        // Reject pure volume/page fragments such as "12(3) 45-67".
        if (!/[A-Za-z]{3,}/.test(candidate)) return undefined;

        return candidate;
    }

    /* ==========================================================
     * Private: marker resolution helpers
     * ========================================================== */

    /** "[3]" -> [3]; "[3,5]" -> [3,5]; "[3-5]" -> [3,4,5]. */
    private expandNumericMarker(marker: string): number[] {
        const inner = /^\[([\d\s,–—-]+)\]$/.exec(marker.trim())?.[1];
        if (!inner) return [];

        const ordinals = new Set<number>();

        for (const part of inner.split(',')) {
            const range = /^\s*(\d{1,3})\s*[–—-]\s*(\d{1,3})\s*$/.exec(part);

            if (range) {
                const from = Number(range[1]);
                const to = Number(range[2]);
                if (to >= from && to - from <= 100) {
                    for (let n = from; n <= to; n++) ordinals.add(n);
                }
                continue;
            }

            const single = Number(part.trim());
            if (Number.isInteger(single) && single > 0) ordinals.add(single);
        }

        return Array.from(ordinals);
    }

    /**
     * Build a searchable bibliographic string for a citation that exists
     * only as an inline marker. Author and year anchor the query; content
     * words from the citing sentence supply the topic.
     */
    private inferredSearchString(surname: string, year: number, claimText: string): string {
        const topic = claimText
            .replace(/\([^)]*\)/g, ' ')       // strip citation markers
            .replace(/\[[^\]]*\]/g, ' ')
            .replace(/[^A-Za-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 3 && !INFERENCE_STOP_WORDS.has(w.toLowerCase()))
            .slice(0, 12)
            .join(' ');

        return topic.length > 0
            ? `${surname} ${year} ${topic}`
            : `${surname} ${year}`;
    }

    /** "(Smith et al., 2020)" -> { surname: "Smith", year: 2020 }. */
    private parseAuthorYear(marker: string): { surname: string; year: number } | null {
        INLINE_AUTHOR_YEAR_MARKER.lastIndex = 0;
        const match = INLINE_AUTHOR_YEAR_MARKER.exec(marker);
        if (!match) return null;

        const surname = match[1].split(/\s+/)[0];
        const year = Number(match[2]);

        if (!surname || !Number.isInteger(year)) return null;
        return { surname, year };
    }

    private authorYearKey(surname: string, year: number): string {
        return `${surname.toLowerCase()}|${year}`;
    }

    /** Best-effort surname of the first listed author. */
    private primarySurname(authors?: string[]): string | undefined {
        const first = authors?.[0]?.trim();
        if (!first) return undefined;

        // "Smith, J." -> Smith ; "J. Smith" -> Smith
        const beforeComma = first.split(',')[0].trim();
        const tokens = beforeComma.split(/\s+/).filter((t) => t.length > 1);
        const surname = tokens.length > 1 ? tokens[tokens.length - 1] : tokens[0];

        if (!surname || !/^[A-Za-z'’-]{2,}$/.test(surname)) return undefined;
        return surname;
    }
}
