import { DecisionTools } from './modules/decisions/decision.tools.js';

async function testIngest() {
  console.log('🧪 Testing ingest_transcript tool execution...');

  const tools = new DecisionTools();
  const mockCtx: any = {
    logger: {
      info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
      error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
      warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || '')
    }
  };

  const sampleTranscript = `Alice: We need to choose our database for Decision Trail.
Bob: I propose PostgreSQL with pgvector for native vector search support.
Alice: Agreed. Postgres with pgvector will keep our data layer robust and simple.`;

  const result = await tools.ingestTranscript({
    transcript_text: sampleTranscript,
    source_name: 'test_meeting_01.txt',
    metadata: { environment: 'test' }
  }, mockCtx);

  console.log('📊 Tool Execution Output:');
  console.log(JSON.stringify(result, null, 2));

  // Query DB to verify stored rows
  const { db } = await import('./db/client.js');
  const dbRows = await db.query(
    `SELECT id, source_name, content, speaker, sequence_num, created_at FROM source_segments WHERE source_name = 'test_meeting_01.txt' ORDER BY sequence_num ASC`
  );

  console.log('\n🗄️ Database Verification (source_segments table):');
  console.table(dbRows.rows);

  process.exit(0);
}

testIngest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
