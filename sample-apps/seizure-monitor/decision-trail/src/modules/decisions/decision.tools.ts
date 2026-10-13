import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { db } from '../../db/client.js';
import { generateEmbedding, formatPgVector } from '../../services/embedding.js';
import { extractDecisionLLM, verifyClaimLLM, classifyRelationshipLLM } from '../../services/llm.js';
import { resolveIdentity } from '../../services/identity.js';

export const EXTRACTION_CONFIDENCE_THRESHOLD = 0.7;

export class DecisionTools {

  // ── Tool 1: ingest_transcript ─────────────────────────────────────────────
  @Tool({
    name: 'ingest_transcript',
    description: 'Chunks transcript text, computes 1536-dim embeddings, and persists to source_segments table.',
    inputSchema: z.object({
      transcript_text: z.string().describe('Full raw transcript text'),
      source_name: z.string().describe('Source name identifier (e.g. meeting_2026-07-25.txt)'),
      metadata: z.record(z.any()).optional().describe('Optional metadata key-value pairs')
    })
  })
  async ingestTranscript(input: { transcript_text: string; source_name: string; metadata?: Record<string, any> }, ctx: ExecutionContext) {
    ctx.logger.info('Ingesting transcript', { source_name: input.source_name });

    // Split transcript into non-empty paragraphs
    const paragraphs = input.transcript_text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const segmentIds: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const content = paragraphs[i];
      const embedding = await generateEmbedding(content);
      const vectorStr = formatPgVector(embedding);

      let speaker: string | null = null;
      let bodyText = content;
      const speakerMatch = content.match(/^([A-Z][a-zA-Z\s]+):\s*(.+)/);
      if (speakerMatch) {
        speaker = speakerMatch[1].trim();
        bodyText = speakerMatch[2].trim();
      }

      const res = await db.query(
        `INSERT INTO source_segments (source_name, content, speaker, sequence_num, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5::vector, $6)
         RETURNING id`,
        [input.source_name, bodyText, speaker, i + 1, vectorStr, JSON.stringify(input.metadata || {})]
      );

      segmentIds.push(res.rows[0].id);
    }

    return {
      status: 'success',
      source_name: input.source_name,
      segments_created: segmentIds.length,
      segment_ids: segmentIds
    };
  }

  // ── Tool 2: search_segments ───────────────────────────────────────────────
  @Tool({
    name: 'search_segments',
    description: 'Vector similarity search over raw transcript and conversation segments.',
    inputSchema: z.object({
      query: z.string().describe('Search query string'),
      top_k: z.number().default(5).describe('Number of matching segments to return')
    })
  })
  async searchSegments(input: { query: string; top_k?: number }, ctx: ExecutionContext) {
    const topK = input.top_k || 5;
    ctx.logger.info('Searching transcript segments', { query: input.query, topK });

    const embedding = await generateEmbedding(input.query);
    const vectorStr = formatPgVector(embedding);

    const res = await db.query(
      `SELECT id as segment_id, source_name, content, speaker, sequence_num,
              1 - (embedding <=> $1::vector) as similarity_score
       FROM source_segments
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, topK]
    );

    return res.rows.map(row => ({
      segment_id: row.segment_id,
      source_name: row.source_name,
      content: row.content,
      speaker: row.speaker,
      sequence_num: row.sequence_num,
      similarity_score: parseFloat(row.similarity_score || '0')
    }));
  }

  // ── Tool 3: search_decisions ──────────────────────────────────────────────
  @Tool({
    name: 'search_decisions',
    description: 'Vector similarity search over pre-extracted decision records.',
    inputSchema: z.object({
      query: z.string().describe('Search query string'),
      top_k: z.number().default(5).describe('Number of decisions to return')
    })
  })
  async searchDecisions(input: { query: string; top_k?: number }, ctx: ExecutionContext) {
    const topK = input.top_k || 5;
    ctx.logger.info('Searching decision records', { query: input.query, topK });

    const embedding = await generateEmbedding(input.query);
    const vectorStr = formatPgVector(embedding);

    const res = await db.query(
      `SELECT id as decision_id, decision, rationale, alternatives, status, owner, topic, quote, source_name,
              1 - (embedding <=> $1::vector) as similarity_score
       FROM decision_events
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, topK]
    );

    return res.rows.map(row => ({
      decision_id: row.decision_id,
      decision: row.decision,
      rationale: row.rationale,
      alternatives: row.alternatives || [],
      status: row.status,
      owner: row.owner,
      topic: row.topic,
      quote: row.quote,
      source_name: row.source_name,
      similarity_score: parseFloat(row.similarity_score || '0')
    }));
  }

  // ── Tool 4: get_related_decisions ─────────────────────────────────────────
  @Tool({
    name: 'get_related_decisions',
    description: 'Retrieves connected, superseding, or dependent decisions from the decision graph.',
    inputSchema: z.object({
      decision_id: z.string().describe('ID of the target decision event')
    })
  })
  async getRelatedDecisions(input: { decision_id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Retrieving related decisions graph', { decision_id: input.decision_id });

    // Query decisions linked via shared segment sources or graph relationships
    const res = await db.query(
      `SELECT DISTINCT d.id as decision_id, d.decision, d.status, d.topic, d.created_at,
              COALESCE(dsl.relationship_type, 'related') as relationship_type
       FROM decision_events d
       JOIN decision_source_links dsl ON d.id = dsl.decision_id
       WHERE dsl.segment_id IN (
         SELECT segment_id FROM decision_source_links WHERE decision_id = $1
       ) AND d.id != $1`,
      [input.decision_id]
    );

    return res.rows.map(row => ({
      decision_id: row.decision_id,
      decision: row.decision,
      relationship_type: row.relationship_type,
      status: row.status,
      timestamp: row.created_at
    }));
  }

  // ── Tool 5: get_segment_context ───────────────────────────────────────────
  @Tool({
    name: 'get_segment_context',
    description: 'Fetches surrounding transcript segments before and after a target segment.',
    inputSchema: z.object({
      segment_id: z.string().describe('Target segment ID'),
      window: z.number().default(2).describe('Number of lines before and after to return')
    })
  })
  async getSegmentContext(input: { segment_id: string; window?: number }, ctx: ExecutionContext) {
    const window = input.window || 2;
    ctx.logger.info('Fetching segment context window', { segment_id: input.segment_id, window });

    const targetRes = await db.query(
      `SELECT source_name, sequence_num FROM source_segments WHERE id = $1`,
      [input.segment_id]
    );

    if (targetRes.rows.length === 0) {
      return [];
    }

    const { source_name, sequence_num } = targetRes.rows[0];

    const res = await db.query(
      `SELECT id as segment_id, content, speaker, sequence_num
       FROM source_segments
       WHERE source_name = $1 AND sequence_num BETWEEN $2 AND $3
       ORDER BY sequence_num ASC`,
      [source_name, sequence_num - window, sequence_num + window]
    );

    return res.rows.map(row => ({
      segment_id: row.segment_id,
      content: row.content,
      speaker: row.speaker,
      sequence_num: row.sequence_num
    }));
  }

  // ── Tool 6: extract_decision_from_segments ───────────────────────────────
  @Tool({
    name: 'extract_decision_from_segments',
    description: 'Analyzes raw transcript segments live to synthesize a structured decision event. Persists high-confidence decisions to Postgres.',
    inputSchema: z.object({
      segment_ids: z.array(z.string()).describe('List of raw segment IDs to analyze and extract from')
    })
  })
  async extractDecisionFromSegments(input: { segment_ids: string[] }, ctx: ExecutionContext) {
    ctx.logger.info('Extracting decision on-demand from segments', { segment_ids: input.segment_ids });

    // Fetch segment contents
    const segRes = await db.query(
      `SELECT id, content, speaker, source_name FROM source_segments WHERE id = ANY($1::uuid[])`,
      [input.segment_ids]
    );

    const fullContext = segRes.rows.map(r => `${r.speaker ? r.speaker + ': ' : ''}${r.content}`).join('\n');
    const sourceName = segRes.rows[0]?.source_name || 'live_extraction';

    // Call LLM for extraction
    const extracted = await extractDecisionLLM(fullContext, sourceName);
    let persisted = false;

    if (extracted.confidence >= EXTRACTION_CONFIDENCE_THRESHOLD) {
      const embedding = await generateEmbedding(`${extracted.decision} ${extracted.rationale}`);
      const vectorStr = formatPgVector(embedding);
      const identity = await resolveIdentity(extracted.owner);

      const insRes = await db.query(
        `INSERT INTO decision_events (decision, rationale, alternatives, status, owner, canonical_owner_id, is_group_consensus, topic, quote, source_name, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)
         RETURNING id`,
        [
          extracted.decision,
          extracted.rationale,
          extracted.alternatives || [],
          extracted.status || 'decided',
          identity.displayOwner,
          identity.canonicalOwnerId,
          identity.isGroupConsensus,
          extracted.topic || 'General',
          extracted.quote || '',
          sourceName,
          vectorStr
        ]
      );

      const decisionId = insRes.rows[0].id;

      // Check existing decisions linked to any of these segment_ids for relationship classification
      const existingDecRes = await db.query(
        `SELECT DISTINCT d.id, d.decision FROM decision_events d
         JOIN decision_source_links dsl ON d.id = dsl.decision_id
         WHERE dsl.segment_id = ANY($1::uuid[]) AND d.id != $2`,
        [input.segment_ids, decisionId]
      );

      let relationshipType: 'supersedes' | 'depends_on' | 'revises' | 'related' = 'related';
      if (existingDecRes.rows.length > 0) {
        relationshipType = await classifyRelationshipLLM(extracted.decision, existingDecRes.rows[0].decision);
      }

      // Link segments to decision with dynamic relationship_type
      for (const segId of input.segment_ids) {
        await db.query(
          `INSERT INTO decision_source_links (decision_id, segment_id, relationship_type)
           VALUES ($1, $2, $3)
           ON CONFLICT (decision_id, segment_id) DO UPDATE SET relationship_type = $3`,
          [decisionId, segId, relationshipType]
        );
      }

      persisted = true;
    }

    return {
      decision: extracted.decision,
      rationale: extracted.rationale,
      alternatives: extracted.alternatives,
      status: extracted.status,
      owner: extracted.owner,
      topic: extracted.topic,
      quote: extracted.quote,
      confidence: extracted.confidence,
      persisted
    };
  }

  // ── Tool 7: verify_claim ──────────────────────────────────────────────────
  @Tool({
    name: 'verify_claim',
    description: 'Strictly verifies whether a candidate claim is supported by evidence in given raw transcript segments.',
    inputSchema: z.object({
      claim: z.string().describe('The claim or statement to verify'),
      segment_ids: z.array(z.string()).describe('List of segment IDs containing evidence')
    })
  })
  async verifyClaim(input: { claim: string; segment_ids: string[] }, ctx: ExecutionContext) {
    ctx.logger.info('Verifying claim against segments', { claim: input.claim, segment_ids: input.segment_ids });

    const segRes = await db.query(
      `SELECT id, content, speaker FROM source_segments WHERE id = ANY($1::uuid[])`,
      [input.segment_ids]
    );

    const context = segRes.rows.map(r => r.content).join('\n');
    const result = await verifyClaimLLM(input.claim, context);

    return {
      verified: result.verified,
      reasoning: result.reasoning,
      supporting_quotes: result.supporting_quotes
    };
  }
}
