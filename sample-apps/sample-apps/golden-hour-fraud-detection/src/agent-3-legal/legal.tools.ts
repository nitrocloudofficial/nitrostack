import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { pool } from '../db/pool.js';

// ---------------------------------------------------------------------------
// Schemas (unchanged — downstream agents rely on this exact shape)
// ---------------------------------------------------------------------------

const LegalCorpusEntrySchema = z.object({
  entry_id: z.string().min(1),
  jurisdiction: z.string().min(1),
  fraud_types: z.array(z.string().min(1)),
  category: z.enum(['statute', 'regulatory_circular', 'compliance_timeline']),
  name: z.string().min(1),
  section: z.string().min(1),
  summary: z.string().min(1),
  source_url: z.string().url(),
  relevance: z.string().min(1),
  mandatory_timeline: z.string().optional(),
  last_verified_at: z.string().min(1),
  version: z.string().min(1),
});

type LegalCorpusEntry = z.infer<typeof LegalCorpusEntrySchema>;

const SearchLegalCorpusInputSchema = z.object({
  fraud_type: z
    .string()
    .min(1)
    .describe('Fraud type from Agent 1 output, such as upi_fraud or phishing'),
  jurisdiction: z
    .string()
    .min(1)
    .describe('Jurisdiction code or region for legal lookup, such as IN or IN-MH'),
  query: z
    .string()
    .optional()
    .describe('Optional extra search text, such as transaction reversal or identity theft'),
});

const SearchLegalCorpusOutputSchema = z.object({
  query: SearchLegalCorpusInputSchema,
  match_count: z.number().int().nonnegative(),
  results: z.array(LegalCorpusEntrySchema),
});

// ---------------------------------------------------------------------------
// Alias / fallback maps
// ---------------------------------------------------------------------------

const FRAUD_TYPE_ALIASES: Record<string, string[]> = {
  upi: ['upi', 'upi_fraud', 'digital_payment_fraud', 'electronic_payment_fraud'],
  upi_fraud: ['upi', 'upi_fraud', 'digital_payment_fraud', 'electronic_payment_fraud'],
  card: ['card', 'card_fraud', 'digital_payment_fraud', 'electronic_payment_fraud'],
  card_fraud: ['card', 'card_fraud', 'digital_payment_fraud', 'electronic_payment_fraud'],
  phishing: ['phishing', 'upi_fraud', 'card_fraud', 'impersonation_scam'],
};

/**
 * Known fraud-domain keywords that we extract from free-form fraud_type strings.
 * Maps each keyword to the canonical fraud_type(s) it implies.
 */
const KEYWORD_TO_FRAUD_TYPES: Record<string, string[]> = {
  upi: ['upi_fraud', 'digital_payment_fraud'],
  qr: ['upi_fraud', 'digital_payment_fraud'],
  card: ['card_fraud', 'digital_payment_fraud'],
  cheque: ['cheque_fraud'],
  check: ['cheque_fraud'],
  phishing: ['phishing', 'identity_theft'],
  impersonation: ['impersonation_scam', 'phishing'],
  investment: ['investment_scam'],
  ponzi: ['investment_scam'],
  crypto: ['investment_scam'],
  scam: ['general_fraud'],
  organized: ['organized_fraud'],
  bank: ['bank_transfer', 'upi_fraud'],
  transfer: ['bank_transfer'],
  wallet: ['wallet_fraud', 'upi_fraud'],
  identity: ['identity_theft', 'phishing'],
  otp: ['phishing', 'upi_fraud'],
  kyc: ['phishing'],
  sim: ['phishing', 'upi_fraud'],
  mule: ['organized_fraud', 'bank_transfer'],
};

const NATIONAL_JURISDICTION_ALIASES = new Set([
  'in',
  'india',
  'national',
  'bharat',
  'indian',
]);

const CITY_TO_NATIONAL_JURISDICTION_ALIASES = new Set([
  'bengaluru',
  'bangalore',
  'mumbai',
  'delhi',
  'new_delhi',
  'chennai',
  'hyderabad',
  'kolkata',
  'pune',
]);

const DEFAULT_DIGITAL_PAYMENT_ENTRY_IDS = [
  'in-it-act-66c',
  'in-it-act-66d',
  'in-bns-318',
  'rbi-unauthorized-electronic-banking-2017',
  'rbi-ppi-unauthorized-payments',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * Extract core fraud-type candidates from a potentially long, free-form
 * fraud_type string like "UPI QR Code Scam (Organized/Repeat)".
 *
 * Strategy:
 *   1. Try the full normalized string as an exact alias key.
 *   2. Tokenize the input and match each token against KEYWORD_TO_FRAUD_TYPES.
 *   3. De-duplicate and return all matched canonical fraud_type values.
 *   4. If nothing matched at all, return the full normalized string so the
 *      DB array-overlap query can still try a long-shot match.
 */
function getFraudTypeCandidates(fraudType: string): string[] {
  const normalizedFraudType = normalize(fraudType);

  // 1. Exact alias match (fast path for clean inputs like "upi_fraud")
  const exactAliases = FRAUD_TYPE_ALIASES[normalizedFraudType];
  if (exactAliases) {
    return [...new Set(exactAliases.map(normalize))];
  }

  // 2. Keyword extraction — tokenize and match
  //    Strip parentheses, slashes, underscores → split on boundaries
  const tokens = normalizedFraudType
    .replace(/[()\/\\,;:]+/g, ' ')
    .replace(/_/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const matched = new Set<string>();

  for (const token of tokens) {
    // Check direct keyword map
    const directHits = KEYWORD_TO_FRAUD_TYPES[token];
    if (directHits) {
      directHits.forEach((ft) => matched.add(ft));
    }

    // Also check alias map for individual tokens
    const aliasHits = FRAUD_TYPE_ALIASES[token];
    if (aliasHits) {
      aliasHits.forEach((ft) => matched.add(normalize(ft)));
    }
  }

  if (matched.size > 0) {
    return [...matched];
  }

  // 3. Fallback — return the raw normalized string
  return [normalizedFraudType];
}

/**
 * Extract ILIKE keyword patterns from fraud_type for fuzzy DB matching.
 * Returns patterns like ['%upi%', '%qr%'] that can be used in
 * WHERE fraud_types::text ILIKE ANY(...)
 */
function extractKeywordPatterns(fraudType: string): string[] {
  const normalizedFraudType = normalize(fraudType);
  const tokens = normalizedFraudType
    .replace(/[()\/\\,;:]+/g, ' ')
    .replace(/_/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const patterns: string[] = [];
  for (const token of tokens) {
    if (KEYWORD_TO_FRAUD_TYPES[token] || FRAUD_TYPE_ALIASES[token]) {
      patterns.push(`%${token}%`);
    }
  }

  return patterns;
}

function resolveJurisdiction(requested: string): string {
  const normalized = normalize(requested);
  if (
    NATIONAL_JURISDICTION_ALIASES.has(normalized) ||
    CITY_TO_NATIONAL_JURISDICTION_ALIASES.has(normalized)
  ) {
    return 'IN';
  }
  return requested.toUpperCase();
}

/** Map a raw pg row to the Zod-validated LegalCorpusEntry shape. */
function rowToEntry(row: Record<string, unknown>): LegalCorpusEntry {
  return {
    entry_id: row.entry_id as string,
    jurisdiction: row.jurisdiction as string,
    fraud_types: row.fraud_types as string[],
    category: row.category as 'statute' | 'regulatory_circular' | 'compliance_timeline',
    name: row.name as string,
    section: row.section as string,
    summary: row.summary as string,
    source_url: row.source_url as string,
    relevance: row.relevance as string,
    mandatory_timeline: (row.mandatory_timeline as string) || undefined,
    last_verified_at: row.last_verified_at as string,
    version: row.version as string,
  };
}

// ---------------------------------------------------------------------------
// Database queries
// ---------------------------------------------------------------------------

/**
 * Primary search: fraud_type array-overlap ∩ jurisdiction ∩ optional query.
 */
async function searchCorpusExact(
  fraudTypeCandidates: string[],
  jurisdiction: string,
  query?: string,
): Promise<LegalCorpusEntry[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 0;

  // fraud_types overlap: fraud_types && $1::text[]
  paramIndex++;
  conditions.push(`fraud_types && $${paramIndex}::text[]`);
  values.push(fraudTypeCandidates);

  // jurisdiction: ILIKE match or national ('IN') fallback
  paramIndex++;
  conditions.push(`(jurisdiction ILIKE $${paramIndex} OR jurisdiction = 'IN')`);
  values.push(`%${jurisdiction}%`);

  // optional free-text across name, section, summary, relevance, mandatory_timeline
  if (query) {
    paramIndex++;
    const ilike = `$${paramIndex}`;
    conditions.push(
      `(name ILIKE ${ilike} OR section ILIKE ${ilike} OR summary ILIKE ${ilike} OR relevance ILIKE ${ilike} OR mandatory_timeline ILIKE ${ilike})`,
    );
    values.push(`%${query}%`);
  }

  const sql = `SELECT * FROM legal_corpus WHERE ${conditions.join(' AND ')} ORDER BY entry_id`;
  const result = await pool.query(sql, values);
  return result.rows.map(rowToEntry);
}

/**
 * Keyword-based ILIKE fallback: cast the fraud_types array to text and
 * search for extracted keyword patterns. This catches cases where the
 * array-overlap missed because the fraud_type input was too verbose
 * (e.g. "UPI QR Code Scam (Organized/Repeat)").
 */
async function searchCorpusByKeywords(
  keywordPatterns: string[],
  jurisdiction: string,
  query?: string,
): Promise<LegalCorpusEntry[]> {
  if (keywordPatterns.length === 0) return [];

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 0;

  // Build ILIKE ANY against the fraud_types array cast to text
  // e.g. fraud_types::text ILIKE '%upi%' OR fraud_types::text ILIKE '%qr%'
  const keywordConditions = keywordPatterns.map(() => {
    paramIndex++;
    return `fraud_types::text ILIKE $${paramIndex}`;
  });
  conditions.push(`(${keywordConditions.join(' OR ')})`);
  values.push(...keywordPatterns);

  // jurisdiction
  paramIndex++;
  conditions.push(`(jurisdiction ILIKE $${paramIndex} OR jurisdiction = 'IN')`);
  values.push(`%${jurisdiction}%`);

  // optional query
  if (query) {
    paramIndex++;
    const ilike = `$${paramIndex}`;
    conditions.push(
      `(name ILIKE ${ilike} OR section ILIKE ${ilike} OR summary ILIKE ${ilike} OR relevance ILIKE ${ilike} OR mandatory_timeline ILIKE ${ilike})`,
    );
    values.push(`%${query}%`);
  }

  const sql = `SELECT * FROM legal_corpus WHERE ${conditions.join(' AND ')} ORDER BY entry_id`;
  const result = await pool.query(sql, values);
  return result.rows.map(rowToEntry);
}

/**
 * Jurisdiction-only fallback (no fraud_type filter).
 */
async function searchCorpusByJurisdiction(
  jurisdiction: string,
  query?: string,
): Promise<LegalCorpusEntry[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 0;

  paramIndex++;
  conditions.push(`(jurisdiction ILIKE $${paramIndex} OR jurisdiction = 'IN')`);
  values.push(`%${jurisdiction}%`);

  if (query) {
    paramIndex++;
    const ilike = `$${paramIndex}`;
    conditions.push(
      `(name ILIKE ${ilike} OR section ILIKE ${ilike} OR summary ILIKE ${ilike} OR relevance ILIKE ${ilike} OR mandatory_timeline ILIKE ${ilike})`,
    );
    values.push(`%${query}%`);
  }

  const sql = `SELECT * FROM legal_corpus WHERE ${conditions.join(' AND ')} ORDER BY entry_id`;
  const result = await pool.query(sql, values);
  return result.rows.map(rowToEntry);
}

/**
 * Broad digital-payment fallback: returns all entries whose fraud_types
 * mention 'upi' plus the curated default entry IDs. Guarantees results
 * even when the input fraud_type was completely unrecognized.
 */
async function getDigitalPaymentFallback(): Promise<LegalCorpusEntry[]> {
  const sql = `
    SELECT * FROM legal_corpus
    WHERE fraud_types::text ILIKE '%upi%'
       OR entry_id = ANY($1::text[])
    ORDER BY entry_id
  `;
  const result = await pool.query(sql, [DEFAULT_DIGITAL_PAYMENT_ENTRY_IDS]);
  return result.rows.map(rowToEntry);
}

// ---------------------------------------------------------------------------
// Tool class
// ---------------------------------------------------------------------------

export class LegalTools {
  @Tool({
    name: 'search_legal_corpus',
    description:
      'Search the maintained legal and regulatory corpus for statutes, RBI guidance, compliance timelines, and source citations relevant to Agent 3. Handles verbose or free-form fraud_type strings by extracting core keywords (e.g. "UPI QR Code Scam" matches upi_fraud entries).',
    inputSchema: SearchLegalCorpusInputSchema,
    outputSchema: SearchLegalCorpusOutputSchema,
    examples: {
      request: {
        fraud_type: 'upi_fraud',
        jurisdiction: 'IN',
        query: 'transaction reversal',
      },
      response: {
        query: {
          fraud_type: 'upi_fraud',
          jurisdiction: 'IN',
          query: 'transaction reversal',
        },
        match_count: 1,
        results: [],
      },
    },
  })
  async searchLegalCorpus(
    input: z.infer<typeof SearchLegalCorpusInputSchema>,
    ctx: ExecutionContext,
  ): Promise<z.infer<typeof SearchLegalCorpusOutputSchema>> {
    ctx.logger.info('Searching legal corpus (PostgreSQL)', input);

    const jurisdiction = resolveJurisdiction(input.jurisdiction);
    const fraudTypeCandidates = getFraudTypeCandidates(input.fraud_type);
    const keywordPatterns = extractKeywordPatterns(input.fraud_type);

    ctx.logger.info('Resolved fraud_type search parameters', {
      raw_fraud_type: input.fraud_type,
      candidates: fraudTypeCandidates,
      keyword_patterns: keywordPatterns,
    });

    try {
      // 1. Exact array-overlap match: fraud_type candidates + jurisdiction + query
      let results = await searchCorpusExact(fraudTypeCandidates, jurisdiction, input.query);

      // 2. Keyword ILIKE fallback (handles verbose fraud types)
      if (results.length === 0 && keywordPatterns.length > 0) {
        ctx.logger.info('Exact match returned 0 — trying keyword ILIKE fallback');
        results = await searchCorpusByKeywords(keywordPatterns, jurisdiction, input.query);
      }

      // 3. Keyword ILIKE without the query filter (query might be too narrow)
      if (results.length === 0 && keywordPatterns.length > 0 && input.query) {
        ctx.logger.info('Keyword + query returned 0 — dropping query filter');
        results = await searchCorpusByKeywords(keywordPatterns, jurisdiction);
      }

      // 4. Jurisdiction-only fallback (drop fraud_type entirely)
      if (results.length === 0) {
        ctx.logger.info('No keyword matches — falling back to jurisdiction-only');
        results = await searchCorpusByJurisdiction(jurisdiction, input.query);
      }

      // 5. Last resort: all digital-payment laws (national + upi-related)
      if (results.length === 0) {
        ctx.logger.info('No jurisdiction matches — returning digital-payment fallback');
        results = await getDigitalPaymentFallback();
      }

      return {
        query: input,
        match_count: results.length,
        results,
      };
    } catch (error) {
      ctx.logger.error('PostgreSQL query failed in search_legal_corpus', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Graceful degradation: return empty results rather than crashing
      return {
        query: input,
        match_count: 0,
        results: [],
      };
    }
  }
}
