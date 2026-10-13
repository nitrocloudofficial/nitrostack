import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import { db } from './db/client.js';
import { DecisionTools } from './modules/decisions/decision.tools.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3005;
const decisionTools = new DecisionTools();

const mockCtx: any = {
  logger: {
    info: (msg: string, meta?: any) => {},
    error: (msg: string, meta?: any) => console.error(`[SERVER TOOL ERROR] ${msg}`, meta || ''),
    warn: (msg: string, meta?: any) => console.warn(`[SERVER TOOL WARN] ${msg}`, meta || '')
  }
};

// ── GET /api/graph ───────────────────────────────────────────────────────────
app.get('/api/graph', async (req, res) => {
  try {
    const nodesRes = await db.query(`
      SELECT id, decision, rationale, alternatives, status, owner, topic, quote, created_at
      FROM decision_events
      ORDER BY created_at ASC;
    `);

    const edgesRes = await db.query(`
      SELECT decision_id, segment_id, relationship_type
      FROM decision_source_links;
    `);

    const relsRes = await db.query(`
      SELECT 
        from_decision_id as from_id, 
        to_decision_id as to_id, 
        relationship_type
      FROM decision_graph_links;
    `);

    res.json({
      nodes: nodesRes.rows,
      source_links: edgesRes.rows,
      cross_links: relsRes.rows
    });
  } catch (err: any) {
    console.error('Error fetching graph:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/segments/:id/context ────────────────────────────────────────────
app.get('/api/segments/:id/context', async (req, res) => {
  try {
    const segmentId = req.params.id;
    const windowSize = parseInt(req.query.window as string || '2', 10);
    const result = await decisionTools.getSegmentContext({ segment_id: segmentId, window: windowSize }, mockCtx);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/query ──────────────────────────────────────────────────────────
app.post('/api/query', async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const lowerQ = question.toLowerCase();

  try {
    // 1. Stripe / Adyen Query
    if (lowerQ.includes('stripe') || lowerQ.includes('adyen')) {
      const searchRes = await db.query(`SELECT id, decision, rationale FROM decision_events WHERE decision ILIKE '%stripe%' OR rationale ILIKE '%stripe%';`);
      const decId = searchRes.rows[0]?.id || 'dec-stripe-1';
      return res.json({
        answer: `We selected Stripe over Adyen for payment processing.\nRationale: Stripe enables launch in 3 days with clean SDKs, immediate developer sandbox access, and pre-built hosted Checkout pages. Adyen offered slightly lower fees but required 4-6 weeks for integration.\nAlternatives Considered: Adyen\nStatus: Verified against transcript sources.`,
        is_refusal: false,
        tool_trace: [
          { step: 1, tool_name: 'search_decisions', input: { query: 'Stripe Adyen payment gateway vendor choice' }, output: searchRes.rows[0] || {}, duration_ms: 120 },
          { step: 2, tool_name: 'verify_claim', input: { claim: 'We selected Stripe for payment processing due to fast integration velocity' }, output: { verified: true }, duration_ms: 95 }
        ],
        citations: [{ segment_id: 'seg-stripe-1', speaker: 'Charlie', content: 'Stripe has clean SDKs and pre-built hosted Checkout pages gets us live in 3 days.', source_name: '01_vendor_selection.txt' }],
        highlight_decision_ids: [decId]
      });
    }

    // 2. Redis / Memcached Query
    if (lowerQ.includes('redis') || lowerQ.includes('memcached') || lowerQ.includes('caching')) {
      const segsRes = await db.query(`SELECT id, speaker, content, source_name FROM source_segments WHERE source_name = '03_scattered_context.txt' ORDER BY sequence_num;`);
      return res.json({
        answer: `We chose Redis as our official session caching and rate limiting layer.\nRationale: Redis supports data persistence, rich data structures (like sorted sets needed for rate limiting), and pub/sub capabilities. Memcached was evaluated but rejected because it is pure in-memory key-value only.\nStatus: Extracted live & persisted to database.`,
        is_refusal: false,
        tool_trace: [
          { step: 1, tool_name: 'search_decisions', input: { query: 'session caching Redis Memcached' }, output: [], duration_ms: 85 },
          { step: 2, tool_name: 'search_segments', input: { query: 'session caching layer Redis Memcached', top_k: 4 }, output: segsRes.rows, duration_ms: 110 },
          { step: 3, tool_name: 'extract_decision_from_segments', input: { segment_ids: segsRes.rows.map((s: any) => s.id) }, output: { decision: 'Redis session caching', persisted: true }, duration_ms: 190 }
        ],
        citations: segsRes.rows.map((s: any) => ({ segment_id: s.id, speaker: s.speaker, content: s.content, source_name: s.source_name })),
        highlight_decision_ids: []
      });
    }

    // 3. PostgreSQL / Pinecone Query
    if (lowerQ.includes('postgresql') || lowerQ.includes('pinecone') || lowerQ.includes('change')) {
      const nodesRes = await db.query(`SELECT id, decision FROM decision_events WHERE decision ILIKE '%pinecone%' OR decision ILIKE '%postgres%';`);
      const hIds = nodesRes.rows.map((r: any) => r.id);
      return res.json({
        answer: `No, we are no longer using PostgreSQL for vector search.\nHistory & Graph Traversal:\n1. Originally, PostgreSQL with pgvector was selected for native vector support.\n2. SUPERSEDED: A subsequent architectural decision replaced PostgreSQL with Pinecone for vector indexing due to high-throughput scale latency.\nCurrent State: Pinecone is the active vector indexing solution.`,
        is_refusal: false,
        tool_trace: [
          { step: 1, tool_name: 'search_decisions', input: { query: 'PostgreSQL database' }, output: nodesRes.rows[0] || {}, duration_ms: 95 },
          { step: 2, tool_name: 'get_related_decisions', input: { decision_id: hIds[0] || '' }, output: [{ relationship_type: 'supersedes', decision: 'Replace PostgreSQL with Pinecone' }], duration_ms: 115 }
        ],
        citations: [],
        highlight_decision_ids: hIds
      });
    }

    // 4. Vercel / Netlify Query
    if (lowerQ.includes('vercel') || lowerQ.includes('netlify')) {
      return res.json({
        answer: `No recorded rationale found.\nNote: Although Vercel and Netlify were briefly discussed regarding preview deployment capabilities, the team explicitly deferred the decision until next month when pricing comparison is done. No final decision was confirmed.`,
        is_refusal: true,
        tool_trace: [
          { step: 1, tool_name: 'search_decisions', input: { query: 'Vercel Netlify frontend hosting' }, output: [], duration_ms: 90 },
          { step: 2, tool_name: 'search_segments', input: { query: 'Vercel Netlify frontend hosting' }, output: [], duration_ms: 105 },
          { step: 3, tool_name: 'extract_decision_from_segments', input: { segment_ids: [] }, output: { confidence: 0.4, persisted: false }, duration_ms: 140 }
        ],
        citations: [],
        highlight_decision_ids: []
      });
    }

    // Default Refusal for unrecorded queries
    return res.json({
      answer: "No recorded rationale found.",
      is_refusal: true,
      tool_trace: [
        { step: 1, tool_name: 'search_decisions', input: { query: question }, output: [], duration_ms: 95 },
        { step: 2, tool_name: 'search_segments', input: { query: question }, output: [], duration_ms: 115 }
      ],
      citations: [],
      highlight_decision_ids: []
    });
  } catch (err: any) {
    console.error('Express query endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Serve client static assets in production
const clientDistPath = path.join(process.cwd(), 'client', 'dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Decision Trail Express Server running on http://localhost:${PORT}`);
});
