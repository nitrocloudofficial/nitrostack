/**
 * VeriCite – Verification Engine
 * services/semantic-scholar.service.ts
 *
 * Queries the Semantic Scholar Academic Graph API for paper metadata.
 * Requires: SEMANTIC_SCHOLAR_API_KEY environment variable.
 *
 * Docs: https://api.semanticscholar.org/graph/v1
 */

import { z } from "zod";
import { createApiClient } from "../utils/api-client.js";
import { createLogger } from "../utils/logger.js";
import { withRetry, isAxiosRetryable } from "../utils/retry.js";
import type { SemanticScholarPaper } from "../types.js";
import type { Citation } from "../types.js";

const logger = createLogger("semantic-scholar");

const FIELDS =
  "paperId,title,abstract,authors,year,externalIds,citationCount,venue,publicationVenue";

// ── Zod schemas ───────────────────────────────────────────────────────────

const SSAuthorSchema = z.object({
  name: z.string().optional(),
});

const SSExternalIdsSchema = z.object({
  DOI: z.string().optional().nullable(),
}).passthrough();

const SSPaperSchema = z.object({
  paperId: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  abstract: z.string().optional().nullable(),
  year: z.number().optional().nullable(),
  authors: z.array(SSAuthorSchema).optional(),
  externalIds: SSExternalIdsSchema.optional().nullable(),
  citationCount: z.number().optional().nullable(),
  venue: z.string().optional().nullable(),
  publicationVenue: z
    .object({ name: z.string().optional() })
    .optional()
    .nullable(),
});

const SSSearchResponseSchema = z.object({
  data: z.array(SSPaperSchema).optional(),
});

// ── Mapping ───────────────────────────────────────────────────────────────

function mapPaper(paper: z.infer<typeof SSPaperSchema>): SemanticScholarPaper {
  const authors = (paper.authors ?? [])
    .map((a) => a.name ?? "")
    .filter(Boolean);

  const doi = paper.externalIds?.DOI ?? null;

  const venue =
    paper.publicationVenue?.name ?? (paper.venue || null);

  return {
    paperId: paper.paperId ?? null,
    title: paper.title ?? null,
    doi,
    year: paper.year ?? null,
    authors,
    abstract: paper.abstract ?? null,
    citationCount: paper.citationCount ?? null,
    venue,
  };
}

// ── Public service class ──────────────────────────────────────────────────

export class SemanticScholarService {
  private readonly client;

  constructor() {
    const apiKey = process.env["SEMANTIC_SCHOLAR_API_KEY"];
    this.client = createApiClient({
      baseURL: "https://api.semanticscholar.org/graph/v1",
      timeoutMs: 8_000,
      headers: {
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
    });

    if (!apiKey) {
      logger.warn(
        "SEMANTIC_SCHOLAR_API_KEY not set — using unauthenticated tier (lower rate limits)"
      );
    }
  }

  /**
   * Retrieves Semantic Scholar metadata for the given citation.
   * Tries direct paper lookup by DOI first, falls back to title/raw citation search.
   */
  async lookupPaper(citation: Citation): Promise<SemanticScholarPaper | null> {
    if (citation.doi) {
      const byDoi = await this.lookupByDoi(citation.doi);
      if (byDoi) {
        logger.info("Semantic Scholar: found paper by DOI", { doi: citation.doi });
        return byDoi;
      }
    }

    const searchString = citation.title?.trim() || citation.raw.trim();
    const byTitle = await this.lookupByTitle(searchString);
    if (byTitle) {
      logger.info("Semantic Scholar: found paper by title/raw citation", { searchString });
    } else {
      logger.warn("Semantic Scholar: no result for citation", { id: citation.id });
    }
    return byTitle;
  }

  private async lookupByDoi(doi: string): Promise<SemanticScholarPaper | null> {
    try {
      // S2 accepts DOI as a paper identifier directly
      const response = await withRetry(
        () =>
          this.client.get(`/paper/DOI:${encodeURIComponent(doi)}`, {
            params: { fields: FIELDS },
          }),
        { maxAttempts: 3, isRetryable: isAxiosRetryable }
      );

      const parsed = SSPaperSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.debug("SS DOI parse failed", { errors: parsed.error.format() });
        return null;
      }
      return mapPaper(parsed.data);
    } catch (err) {
      logger.warn("Semantic Scholar DOI lookup failed", {
        doi,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  private async lookupByTitle(title: string): Promise<SemanticScholarPaper | null> {
    try {
      const response = await withRetry(
        () =>
          this.client.get("/paper/search", {
            params: {
              query: title,
              limit: 3,
              fields: FIELDS,
            },
          }),
        { maxAttempts: 3, isRetryable: isAxiosRetryable }
      );

      const parsed = SSSearchResponseSchema.safeParse(response.data);
      if (!parsed.success || !parsed.data.data?.length) {
        logger.debug("Semantic Scholar title search: no results or parse failed");
        return null;
      }

      const firstResult = parsed.data.data[0];
      if (!firstResult) return null;
      return mapPaper(firstResult);
    } catch (err) {
      logger.warn("Semantic Scholar title search failed", {
        title,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }
}
