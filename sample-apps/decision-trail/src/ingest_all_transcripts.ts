import fs from 'fs';
import path from 'path';
import { db } from './db/client.js';
import { DecisionTools } from './modules/decisions/decision.tools.js';
import { seedPeople } from './services/identity.js';

const TRANSCRIPT_DIR = path.join(process.cwd(), 'data', 'demo_transcripts');
const decisionTools = new DecisionTools();

const mockCtx: any = {
  logger: {
    info: (msg: string, meta?: any) => console.log(`[INGEST] ${msg}`, meta || ''),
    error: (msg: string, meta?: any) => console.error(`[INGEST ERROR] ${msg}`, meta || ''),
    warn: (msg: string, meta?: any) => console.warn(`[INGEST WARN] ${msg}`, meta || '')
  }
};

async function ingestAll() {
  console.log('=== STARTING DATASET SCALE EXPANSION INGESTION ===\n');

  // 1. Seed People Table
  await seedPeople();
  console.log('✅ Canonical people table seeded.');

  // 2. Read all files in data/demo_transcripts
  const files = fs.readdirSync(TRANSCRIPT_DIR).filter(f => f.endsWith('.txt')).sort();
  console.log(`Found ${files.length} transcript files to process.\n`);

  for (const filename of files) {
    const filePath = path.join(TRANSCRIPT_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');

    console.log(`Processing [${filename}]...`);

    // Ingest Transcript
    const ingestRes = await decisionTools.ingestTranscript(
      { transcript_text: content, source_name: filename },
      mockCtx
    );

    // Extract Decision from ingested segment IDs
    if (ingestRes.segment_ids && ingestRes.segment_ids.length > 0) {
      const extractRes = await decisionTools.extractDecisionFromSegments(
        { segment_ids: ingestRes.segment_ids },
        mockCtx
      );

      console.log(`  -> Decision: "${extractRes.decision}" | Confidence: ${extractRes.confidence} | Persisted: ${extractRes.persisted}`);
    }
  }

  // 3. Report DB Statistics
  const segsCount = await db.query('SELECT count(*) FROM source_segments;');
  const decsCount = await db.query('SELECT count(*) FROM decision_events;');
  const peopleCount = await db.query('SELECT count(*) FROM people;');
  const linksCount = await db.query(`
    SELECT relationship_type, count(*) 
    FROM decision_source_links 
    GROUP BY relationship_type;
  `);

  console.log('\n================ DATASET EXPANSION SUMMARY ================');
  console.log(`Total Transcripts Processed: ${files.length}`);
  console.log(`Total Source Segments: ${segsCount.rows[0].count}`);
  console.log(`Total Decision Events: ${decsCount.rows[0].count}`);
  console.log(`Total Canonical People: ${peopleCount.rows[0].count}`);
  console.log('Relationship Links Breakdown:');
  linksCount.rows.forEach(r => console.log(`  - ${r.relationship_type.toUpperCase()}: ${r.count}`));
  console.log('===========================================================\n');

  await db.end();
}

ingestAll().catch(console.error);
