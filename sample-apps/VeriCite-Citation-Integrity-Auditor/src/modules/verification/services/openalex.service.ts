/**
 * VeriCite – Verification Engine
 * services/openalex.service.ts
 *
 * Queries the OpenAlex API for academic paper metadata:
 * abstract, concepts, citation count, authors, venue.
 *
 * Docs: https://docs.openalex.org/api-entities/works
 */

import { z } from "zod";
import { createApiClient } from "../utils/api-client.js";
import { createLogger } from "../utils/logger.js";
import { politeUserAgent } from "../utils/contact.js";
import { withRetry, isAxiosRetryable } from "../utils/retry.js";
import type { OpenAlexPaper } from "../types.js";
import type { Citation } from "../types.js";

const logger = createLogger("openalex");

// ── Zod schemas ───────────────────────────────────────────────────────────

const OpenAlexAuthorshipSchema = z.object({
  author: z
    .object({
      display_name: z.string().optional(),
    })
    .optional(),
});

const OpenAlexConceptSchema = z.object({
  display_name: z.string().optional(),
  score: z.number().optional(),
});

const OpenAlexSourceSchema = z.object({
  display_name: z.string().optional(),
});

const OpenAlexWorkSchema = z.object({
  id: z.string().optional(),
  doi: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  publication_year: z.number().optional().nullable(),
  authorships: z.array(OpenAlexAuthorshipSchema).optional(),
  abstract_inverted_index: z.record(z.array(z.number())).optional().nullable(),
  cited_by_count: z.number().optional().nullable(),
  is_retracted: z.boolean().optional().nullable(),
  primary_location: z
    .object({
      source: OpenAlexSourceSchema.optional().nullable(),
    })
    .optional()
    .nullable(),
  concepts: z.array(OpenAlexConceptSchema).optional(),
});

const OpenAlexSearchResponseSchema = z.object({
  results: z.array(OpenAlexWorkSchema).optional(),
});

// ── Abstract reconstruction ───────────────────────────────────────────────
// OpenAlex stores abstracts as an inverted index: { word: [positions] }

function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null | undefined
): string | null {
  if (!invertedIndex || Object.keys(invertedIndex).length === 0) return null;

  const wordPositions: [string, number][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      wordPositions.push([word, pos]);
    }
  }

  wordPositions.sort((a, b) => a[1] - b[1]);
  return wordPositions.map(([word]) => word).join(" ");
}

// ── Mapping ───────────────────────────────────────────────────────────────

function mapWork(work: z.infer<typeof OpenAlexWorkSchema>): OpenAlexPaper {
  const doi = work.doi
    ? work.doi.replace("https://doi.org/", "").trim()
    : null;

  const authors = (work.authorships ?? [])
    .map((a) => a.author?.display_name ?? "")
    .filter(Boolean);

  const abstract = reconstructAbstract(work.abstract_inverted_index);

  const concepts = (work.concepts ?? [])
    .filter((c) => (c.score ?? 0) > 0.3)
    .map((c) => c.display_name ?? "")
    .filter(Boolean);

  const venue = work.primary_location?.source?.display_name ?? null;

  return {
    id: work.id ?? null,
    title: work.title ?? null,
    doi,
    year: work.publication_year ?? null,
    authors,
    abstract,
    citationCount: work.cited_by_count ?? null,
    venue,
    concepts,
    retracted: work.is_retracted === true,
  };
}

// ── Public service class ──────────────────────────────────────────────────

export class OpenAlexService {
  private readonly client = createApiClient({
    baseURL: "https://api.openalex.org",
    timeoutMs: 8_000,
    headers: {
      // Polite pool: see utils/contact.ts for sanitisation rationale.
      "User-Agent": politeUserAgent(),
    },
  });

  /**
   * Retrieves full OpenAlex metadata for the given citation.
   * Tries DOI lookup first, falls back to title/raw citation search.
   */
  async lookupPaper(citation: Citation): Promise<OpenAlexPaper | null> {
    if (citation.doi) {
      const byDoi = await this.lookupByDoi(citation.doi);
      if (byDoi) {
        logger.info("OpenAlex: found paper by DOI", { doi: citation.doi });
        return byDoi;
      }
    }

    const searchString = citation.title?.trim() || citation.raw.trim();
    const byTitle = await this.lookupByTitle(searchString);
    if (byTitle) {
      logger.info("OpenAlex: found paper by title/raw citation", { searchString });
    } else {
      logger.warn("OpenAlex: no result for citation", { id: citation.id });
    }
    return byTitle;
  }

  private async lookupByDoi(doi: string): Promise<OpenAlexPaper | null> {
    try {
      // OpenAlex accepts DOI filter as: /works/https://doi.org/{doi}
      const encodedDoi = encodeURIComponent(`https://doi.org/${doi}`);
      const response = await withRetry(
        () => this.client.get(`/works/${encodedDoi}`),
        { maxAttempts: 3, isRetryable: isAxiosRetryable }
      );

      const parsed = OpenAlexWorkSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.debug("OpenAlex DOI lookup parse failed", { errors: parsed.error.format() });
        return null;
      }
      return mapWork(parsed.data);
    } catch (err) {
      logger.warn("OpenAlex DOI lookup failed", {
        doi,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  private async lookupByTitle(title: string): Promise<OpenAlexPaper | null> {
    try {
      const response = await withRetry(
        () =>
          this.client.get("/works", {
            params: {
              search: title,
              per_page: 3,
              select: "id,doi,title,publication_year,authorships,abstract_inverted_index,cited_by_count,primary_location,concepts,is_retracted",
            },
          }),
        { maxAttempts: 3, isRetryable: isAxiosRetryable }
      );

      const parsed = OpenAlexSearchResponseSchema.safeParse(response.data);
      if (!parsed.success || !parsed.data.results?.length) {
        logger.debug("OpenAlex title search: no results or parse failed");
        return null;
      }

      // Return the first (most relevant) result
      const firstResult = parsed.data.results[0];
      if (!firstResult) return null;
      return mapWork(firstResult);
    } catch (err) {
      logger.warn("OpenAlex title search failed", {
        title,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }
}
