import { DecisionTools } from './modules/decisions/decision.tools.js';
import { db } from './db/client.js';

async function testAllTools() {
  console.log('🚀 Starting Verification of All 7 Atomic MCP Tools...\n');

  const tools = new DecisionTools();
  const mockCtx: any = {
    logger: {
      info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta ? JSON.stringify(meta) : ''),
      error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta ? JSON.stringify(meta) : ''),
      warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta ? JSON.stringify(meta) : '')
    }
  };

  // 1. Tool 1: ingest_transcript
  console.log('--- 1. Testing ingest_transcript ---');
  const transcriptText = `Alice: We need to finalize the database stack for Decision Trail.
Bob: I propose PostgreSQL with pgvector because it gives us robust relational storage plus vector similarity search.
Charlie: I agree. Postgres with pgvector will keep the architecture clean and unified.
Alice: Decision confirmed: We are using PostgreSQL with pgvector for Decision Trail.`;

  const ingestRes = await tools.ingestTranscript({
    transcript_text: transcriptText,
    source_name: 'architecture_meeting_2026-07-25.txt',
    metadata: { team: 'backend' }
  }, mockCtx);
  console.log('Result:', JSON.stringify(ingestRes, null, 2));

  // 2. Tool 2: search_segments
  console.log('\n--- 2. Testing search_segments ---');
  const searchSegRes = await tools.searchSegments({
    query: 'database proposal PostgreSQL pgvector',
    top_k: 2
  }, mockCtx);
  console.log('Result:', JSON.stringify(searchSegRes, null, 2));

  // 3. Tool 6: extract_decision_from_segments
  console.log('\n--- 3. Testing extract_decision_from_segments (with threshold 0.7 persistence) ---');
  const segmentIds = searchSegRes.map(s => s.segment_id);
  const extractRes = await tools.extractDecisionFromSegments({
    segment_ids: segmentIds
  }, mockCtx);
  console.log('Result:', JSON.stringify(extractRes, null, 2));

  // 4. Tool 3: search_decisions
  console.log('\n--- 4. Testing search_decisions ---');
  const searchDecRes = await tools.searchDecisions({
    query: 'What database did we decide to use?',
    top_k: 2
  }, mockCtx);
  console.log('Result:', JSON.stringify(searchDecRes, null, 2));

  // 5. Tool 4: get_related_decisions
  console.log('\n--- 5. Testing get_related_decisions ---');
  if (searchDecRes.length > 0) {
    const relatedRes = await tools.getRelatedDecisions({
      decision_id: searchDecRes[0].decision_id
    }, mockCtx);
    console.log('Result:', JSON.stringify(relatedRes, null, 2));
  }

  // 6. Tool 5: get_segment_context
  console.log('\n--- 6. Testing get_segment_context ---');
  if (segmentIds.length > 0) {
    const contextRes = await tools.getSegmentContext({
      segment_id: segmentIds[0],
      window: 1
    }, mockCtx);
    console.log('Result:', JSON.stringify(contextRes, null, 2));
  }

  // 7. Tool 7: verify_claim
  console.log('\n--- 7. Testing verify_claim ---');
  const verifyRes = await tools.verifyClaim({
    claim: 'PostgreSQL with pgvector was chosen for Decision Trail',
    segment_ids: segmentIds
  }, mockCtx);
  console.log('Result:', JSON.stringify(verifyRes, null, 2));

  console.log('\n✅ All 7 Tools Tested Successfully!');
  process.exit(0);
}

testAllTools().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
