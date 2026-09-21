/**
 * VeriCite – Verification Engine
 * services/crossref.service.ts
 *
 * Searches the Crossref REST API for a paper matching the given reference.
 * Extracts: DOI, title, authors, publication year, publisher.
 */
import { z } from "zod";
import { createApiClient } from "../utils/api-client.js";
import { createLogger } from "../utils/logger.js";
import { politeUserAgent } from "../utils/contact.js";
import { withRetry, isAxiosRetryable } from "../utils/retry.js";
const logger = createLogger("crossref");
// ── Zod schemas for Crossref API response validation ──────────────────────
const CrossrefAuthorSchema = z.object({
    given: z.string().optional(),
    family: z.string().optional(),
    name: z.string().optional(),
});
const CrossrefItemSchema = z.object({
    DOI: z.string().optional(),
    title: z.array(z.string()).optional(),
    author: z.array(CrossrefAuthorSchema).optional(),
    published: z
        .object({
        "date-parts": z.array(z.array(z.number())).optional(),
    })
        .optional(),
    "published-print": z
        .object({
        "date-parts": z.array(z.array(z.number())).optional(),
    })
        .optional(),
    "published-online": z
        .object({
        "date-parts": z.array(z.array(z.number())).optional(),
    })
        .optional(),
    publisher: z.string().optional(),
    URL: z.string().optional(),
    score: z.number().optional(),
});
/**
 * DOI lookup: GET /works/{doi}
 * The real Crossref API places the work's fields directly inside `message`.
 */
const CrossrefDoiResponseSchema = z.object({
    message: CrossrefItemSchema,
});
/**
 * Title search: GET /works?query=...
 * Returns a list of works under `message.items`.
 */
const CrossrefSearchResponseSchema = z.object({
    message: z.object({
        items: z.array(CrossrefItemSchema).optional(),
    }),
});
// ── Internal helpers ──────────────────────────────────────────────────────
function extractYear(item) {
    const sources = [
        item.published?.["date-parts"],
        item["published-print"]?.["date-parts"],
        item["published-online"]?.["date-parts"],
    ];
    for (const dateParts of sources) {
        const year = dateParts?.[0]?.[0];
        if (typeof year === "number" && year > 1000)
            return year;
    }
    return null;
}
function extractAuthors(item) {
    if (!item.author || item.author.length === 0)
        return [];
    return item.author.map((a) => {
        if (a.name)
            return a.name;
        const parts = [a.family, a.given].filter(Boolean);
        return parts.join(", ");
    });
}
function mapItem(item) {
    return {
        title: item.title?.[0] ?? null,
        doi: item.DOI ?? null,
        year: extractYear(item),
        authors: extractAuthors(item),
        publisher: item.publisher ?? null,
        url: item.URL ?? null,
        score: item.score ?? 0,
    };
}
// ── Public service class ──────────────────────────────────────────────────
export class CrossrefService {
    client = createApiClient({
        baseURL: "https://api.crossref.org",
        timeoutMs: 8_000,
        headers: {
            // Polite pool: see utils/contact.ts for sanitisation rationale.
            "User-Agent": politeUserAgent(),
        },
    });
    /**
     * Looks up a paper in Crossref using its DOI (preferred) or title/raw citation.
     * Returns the best-matching CrossrefPaper, or null if not found.
     */
    async lookupPaper(citation) {
        // ── Strategy 1: Direct DOI lookup ─────────────────────────────────────
        if (citation.doi) {
            const result = await this.lookupByDoi(citation.doi);
            if (result) {
                logger.info(`Crossref: found paper by DOI`, { doi: citation.doi });
                return result;
            }
        }
        // ── Strategy 2: Title / Raw citation search ────────────────────────────
        const searchString = citation.title?.trim() || citation.raw.trim();
        const result = await this.lookupByTitle(searchString);
        if (result) {
            logger.info(`Crossref: found paper by title/raw citation`, { searchString });
        }
        else {
            logger.warn(`Crossref: no result for citation`, { id: citation.id });
        }
        return result;
    }
    async lookupByDoi(doi) {
        try {
            const response = await withRetry(() => this.client.get(`/works/${encodeURIComponent(doi)}`), { maxAttempts: 3, isRetryable: isAxiosRetryable });
            // Crossref /works/{doi} returns the work directly inside `message`,
            // not nested under a `message.item` key.
            const parsed = CrossrefDoiResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                logger.debug("Crossref DOI lookup: response parse failed", {
                    errors: parsed.error.format(),
                });
                return null;
            }
            return mapItem(parsed.data.message);
        }
        catch (err) {
            logger.warn("Crossref DOI lookup failed", {
                doi,
                error: err instanceof Error ? err.message : String(err),
            });
            return null;
        }
    }
    async lookupByTitle(title) {
        try {
            const response = await withRetry(() => this.client.get("/works", {
                params: {
                    query: title,
                    rows: 3,
                    select: "DOI,title,author,published,published-print,published-online,publisher,URL,score",
                },
            }), { maxAttempts: 3, isRetryable: isAxiosRetryable });
            const parsed = CrossrefSearchResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                logger.debug("Crossref title search: parse failed", { errors: parsed.error.format() });
                return null;
            }
            const items = parsed.data.message.items ?? [];
            if (items.length === 0)
                return null;
            // Return the highest-scoring item
            const best = items.reduce((prev, curr) => (curr.score ?? 0) > (prev.score ?? 0) ? curr : prev);
            return mapItem(best);
        }
        catch (err) {
            logger.warn("Crossref title search failed", {
                title,
                error: err instanceof Error ? err.message : String(err),
            });
            return null;
        }
    }
}
//# sourceMappingURL=crossref.service.js.map