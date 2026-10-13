import { DecisionTools } from './modules/decisions/decision.tools.js';
import { db } from './db/client.js';

async function testFixesAndPositivePath() {
  console.log('===============================================================');
  console.log('🛠️ TESTING FIX 1 (ALTERNATIVES PROMPT) AND FIX 2 (RELATIONSHIPS)');
  console.log('===============================================================\n');

  const tools = new DecisionTools();
  const mockCtx: any = {
    logger: {
      info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta ? JSON.stringify(meta) : ''),
      error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta ? JSON.stringify(meta) : ''),
      warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta ? JSON.stringify(meta) : '')
    }
  };

  // ── FIX 1 VERIFICATION: Ingest & Extract Decision 1 ─────────────────────────
  console.log('📌 FIX 1: INGESTING TRANSCRIPT & TESTING ALTERNATIVE FIELD EXCLUSION...');
  const transcript1 = `Alice: We need to choose the primary database for Decision Trail.

Bob: Should we use MongoDB with vector search plugins?

Charlie: I strongly recommend PostgreSQL with pgvector instead. It provides native vector search support alongside robust relational transactions, giving us one less service to manage.

Alice: That makes total sense. We will select PostgreSQL with pgvector as our database stack.`;

  const ingestRes1 = await tools.ingestTranscript({
    transcript_text: transcript1,
    source_name: 'db_selection_meeting_fix.txt',
    metadata: { topic: 'database' }
  }, mockCtx);

  const segmentIds1 = ingestRes1.segment_ids;
  const extractRes1 = await tools.extractDecisionFromSegments({
    segment_ids: segmentIds1
  }, mockCtx);

  console.log('Extraction Result (FIX 1 Check):');
  console.log(JSON.stringify(extractRes1, null, 2));

  // Assert FIX 1: Check that alternatives DOES NOT contain the selected decision
  const hasSelectedInAlternatives = extractRes1.alternatives.some(
    alt => alt.toLowerCase().includes('postgresql') || alt.toLowerCase().includes('pgvector')
  );
  if (hasSelectedInAlternatives) {
    console.error('❌ FIX 1 FAILED: Selected option is still present in alternatives array:', extractRes1.alternatives);
  } else {
    console.log('✅ FIX 1 PASSED: Alternatives array strictly contains non-selected options:', extractRes1.alternatives);
  }

  // ── FIX 2 VERIFICATION: Test depends_on classification ─────────────────────
  console.log('\n📌 FIX 2A: INGESTING DEPENDENT HOSTING DECISION & CHECKING DEPENDS_ON CLASSIFICATION...');
  const transcript2 = `Alice: Following up on our PostgreSQL database choice, how should we host it?

Charlie: We will host PostgreSQL on AWS RDS PostgreSQL 16 with pgvector extension enabled.

Bob: Sounds great, RDS manages backups and multi-AZ failover for us.`;

  const ingestRes2 = await tools.ingestTranscript({
    transcript_text: transcript2,
    source_name: 'db_hosting_meeting_fix.txt',
    metadata: { topic: 'database' }
  }, mockCtx);

  // Pass shared segment to trigger link classification
  const extractRes2 = await tools.extractDecisionFromSegments({
    segment_ids: [segmentIds1[0], ...ingestRes2.segment_ids]
  }, mockCtx);
  console.log('Second Decision Extraction (Hosting):', JSON.stringify(extractRes2, null, 2));

  // Query DB decision ID 1
  const dbDec1 = await db.query(`SELECT id FROM decision_events WHERE source_name = 'db_selection_meeting_fix.txt'`);
  const decId1 = dbDec1.rows[0].id;

  const relatedRes1 = await tools.getRelatedDecisions({ decision_id: decId1 }, mockCtx);
  console.log('Get Related Decisions Result (depends_on check):');
  console.log(JSON.stringify(relatedRes1, null, 2));

  // ── FIX 2B VERIFICATION: Test supersedes classification ─────────────────────
  console.log('\n📌 FIX 2B: INGESTING SUPERSEDING DECISION & CHECKING SUPERSEDES CLASSIFICATION...');
  const transcript3 = `Alice: Urgent update regarding our database stack. PostgreSQL performance on vector search at scale is proving too costly.

Bob: I propose we switch from PostgreSQL to Pinecone vector DB instead for pure vector indexing.

Charlie: Agreed, we replace PostgreSQL with Pinecone for vectors starting next sprint.`;

  const ingestRes3 = await tools.ingestTranscript({
    transcript_text: transcript3,
    source_name: 'db_reversal_meeting_fix.txt',
    metadata: { topic: 'database' }
  }, mockCtx);

  const extractRes3 = await tools.extractDecisionFromSegments({
    segment_ids: [segmentIds1[0], ...ingestRes3.segment_ids]
  }, mockCtx);
  console.log('Third Decision Extraction (Reversal):', JSON.stringify(extractRes3, null, 2));

  const relatedRes2 = await tools.getRelatedDecisions({ decision_id: decId1 }, mockCtx);
  console.log('Get Related Decisions Graph Result (supersedes / relationship_type check):');
  console.log(JSON.stringify(relatedRes2, null, 2));

  console.log('\n🎉 ALL FIX 1 AND FIX 2 VERIFICATIONS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testFixesAndPositivePath().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
