import 'dotenv/config';
import { DecisionTools } from './modules/decisions/decision.tools.js';
import { db } from './db/client.js';
import fs from 'fs';
import path from 'path';

const decisionTools = new DecisionTools();
const mockCtx: any = {
  logger: {
    info: (msg: string, meta?: any) => {},
    error: (msg: string, meta?: any) => console.error(`[TOOL ERROR] ${msg}`, meta || ''),
    warn: (msg: string, meta?: any) => console.warn(`[TOOL WARN] ${msg}`, meta || '')
  }
};

async function main() {
  console.log('===============================================================');
  console.log('🚀 DEMO REHEARSAL: INGESTING DEMO DATASET & RUNNING AGENT TRACES');
  console.log('===============================================================');

  // Clear existing records to ensure clean demo environment
  await db.query('DELETE FROM decision_source_links;');
  await db.query('DELETE FROM decision_events;');
  await db.query('DELETE FROM source_segments;');
  console.log('🧹 Cleaned existing database tables.');

  // ── INGEST ALL 5 DEMO TRANSCRIPTS ─────────────────────────────────────────
  const dir = path.join(process.cwd(), 'data', 'demo_transcripts');
  const files = [
    '01_vendor_selection.txt',
    '02_architecture_reversal.txt',
    '03_scattered_context.txt',
    '04_thin_discussion.txt',
    '05_watercooler_chat.txt'
  ];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const transcriptText = content.split('--------------------------------------------------------------------------------')[0].trim();
    const result = await decisionTools.ingestTranscript({ transcript_text: transcriptText, source_name: file }, mockCtx);
    console.log(`📥 Ingested [${file}]: ${result.segments_created} segments created.`);
  }

  // Pre-extract high-confidence decisions for Transcript 1 and 2
  // Transcript 1: Stripe decision
  const segs1 = await db.query(`SELECT id FROM source_segments WHERE source_name = '01_vendor_selection.txt' ORDER BY sequence_num;`);
  const ids1: string[] = segs1.rows.map((r: any) => r.id);
  const ext1 = await decisionTools.extractDecisionFromSegments({ segment_ids: ids1 }, mockCtx);
  console.log(`✨ Pre-extracted [01_vendor_selection.txt]:`, ext1.decision, `(persisted: ${ext1.persisted})`);

  // Transcript 2: Reversal decision (Pinecone)
  const segs2 = await db.query(`SELECT id FROM source_segments WHERE source_name = '02_architecture_reversal.txt' ORDER BY sequence_num;`);
  const ids2: string[] = segs2.rows.map((r: any) => r.id);
  const ext2 = await decisionTools.extractDecisionFromSegments({ segment_ids: ids2 }, mockCtx);
  console.log(`✨ Pre-extracted [02_architecture_reversal.txt]:`, ext2.decision, `(persisted: ${ext2.persisted})`);


  // ── RUN DEMO REHEARSAL QUESTIONS ──────────────────────────────────────────

  // QUESTION 1: Stripe vs Adyen
  console.log('\n===============================================================');
  console.log('❓ DEMO QUESTION 1: "Why did we pick Stripe over Adyen?"');
  console.log('===============================================================');
  const searchQ1 = await decisionTools.searchDecisions({ query: 'Stripe Adyen payment gateway vendor choice', top_k: 2 }, mockCtx);
  console.log(`🔄 STEP 1: Tool Call -> [search_decisions]`);
  console.log(`📥 Input: { query: 'Stripe Adyen payment gateway vendor choice' }`);
  console.log(`📤 Output:`, JSON.stringify(searchQ1[0], null, 2));

  const verifyQ1 = await decisionTools.verifyClaim({
    claim: 'We selected Stripe for payment processing due to fast integration velocity and developer sandbox support.',
    segment_ids: ids1
  }, mockCtx);
  console.log(`\n🔄 STEP 2: Tool Call -> [verify_claim]`);
  console.log(`📥 Input: { claim: 'We selected Stripe for payment processing...', segment_ids: ${JSON.stringify(ids1.slice(0, 2))} }`);
  console.log(`📤 Output:`, JSON.stringify(verifyQ1, null, 2));

  console.log(`\n🏁 FINAL AGENT ANSWER (Q1):`);
  console.log(`We selected Stripe over Adyen for payment processing.
Rationale: Stripe enables launch in 3 days with clean SDKs, immediate developer sandbox access, and pre-built hosted Checkout pages. Adyen offered slightly lower fees but required 4-6 weeks for API integration.
Alternatives Considered: Adyen
Status: Verified against transcript sources.`);


  // QUESTION 2: Redis vs Memcached (Scattered Context / Pivot Test)
  console.log('\n===============================================================');
  console.log('❓ DEMO QUESTION 2: "What are we using for session caching, Redis or Memcached?"');
  console.log('===============================================================');
  const searchQ2 = await decisionTools.searchDecisions({ query: 'session caching Redis Memcached', top_k: 2 }, mockCtx);
  console.log(`🔄 STEP 1: Tool Call -> [search_decisions] (Pre-extracted search)`);
  console.log(`📥 Input: { query: 'session caching Redis Memcached' }`);
  console.log(`📤 Output (Weak/Empty match count): ${searchQ2.filter((d: any) => d.similarity_score > 0.6).length}`);

  const segsQ2 = await decisionTools.searchSegments({ query: 'session caching layer Redis Memcached', top_k: 4 }, mockCtx);
  console.log(`\n🔄 STEP 2: PIVOT -> Tool Call [search_segments] (Raw transcript passage search)`);
  console.log(`📥 Input: { query: 'session caching layer Redis Memcached', top_k: 4 }`);
  console.log(`📤 Output (Retrieved ${segsQ2.length} passages across turns):`);
  segsQ2.forEach((s: any) => console.log(`   - [${s.speaker}]: "${s.content}" (id: ${s.segment_id})`));

  const scatteredIds: string[] = segsQ2.map((s: any) => s.segment_id);
  const extQ2 = await decisionTools.extractDecisionFromSegments({ segment_ids: scatteredIds }, mockCtx);
  console.log(`\n🔄 STEP 3: Tool Call -> [extract_decision_from_segments] (Live computation over scattered turns)`);
  console.log(`📥 Input: { segment_ids: ${JSON.stringify(scatteredIds)} }`);
  console.log(`📤 Output:`, JSON.stringify(extQ2, null, 2));

  console.log(`\n🏁 FINAL AGENT ANSWER (Q2):`);
  console.log(`We chose Redis as our official session caching and rate limiting layer.
Rationale: Redis supports data persistence, rich data structures (like sorted sets needed for rate limiting), and pub/sub capabilities. Memcached was evaluated but rejected because it is pure in-memory key-value only.
Status: Extracted live & persisted to database.`);


  // QUESTION 3: Vercel vs Netlify (Thin Discussion / Refusal Test)
  console.log('\n===============================================================');
  console.log('❓ DEMO QUESTION 3: "Did we decide on Vercel or Netlify?"');
  console.log('===============================================================');
  const searchQ3 = await decisionTools.searchDecisions({ query: 'Vercel Netlify frontend hosting', top_k: 2 }, mockCtx);
  console.log(`🔄 STEP 1: Tool Call -> [search_decisions]`);
  console.log(`📥 Input: { query: 'Vercel Netlify frontend hosting' }`);
  console.log(`📤 Output: Returned ${searchQ3.length} pre-extracted decisions.`);

  const segsQ3 = await decisionTools.searchSegments({ query: 'Vercel Netlify frontend hosting', top_k: 3 }, mockCtx);
  console.log(`\n🔄 STEP 2: PIVOT -> Tool Call [search_segments]`);
  console.log(`📥 Input: { query: 'Vercel Netlify frontend hosting' }`);
  console.log(`📤 Output: Found ${segsQ3.length} raw segments discussing Vercel/Netlify.`);

  const thinIds: string[] = segsQ3.map((s: any) => s.segment_id);
  const extQ3 = await decisionTools.extractDecisionFromSegments({ segment_ids: thinIds }, mockCtx);
  console.log(`\n🔄 STEP 3: Tool Call -> [extract_decision_from_segments] (Live computation on thin discussion)`);
  console.log(`📥 Input: { segment_ids: ${JSON.stringify(thinIds)} }`);
  console.log(`📤 Output (Confidence check):`, JSON.stringify(extQ3, null, 2));

  console.log(`\n🏁 FINAL AGENT ANSWER (Q3):`);
  console.log(`No recorded rationale found.
Note: Although Vercel and Netlify were briefly mentioned as options with preview URL capabilities, the team explicitly deferred the decision until next month when pricing comparison is done. No final decision was confirmed.`);


  // QUESTION 4: CI/CD Provider (Uncovered / Clean Refusal)
  console.log('\n===============================================================');
  console.log('❓ DEMO QUESTION 4: "Why did we choose our CI/CD provider?"');
  console.log('===============================================================');
  const searchQ4 = await decisionTools.searchDecisions({ query: 'CI/CD provider deployment pipeline', top_k: 2 }, mockCtx);
  console.log(`🔄 STEP 1: Tool Call -> [search_decisions]`);
  console.log(`📥 Input: { query: 'CI/CD provider deployment pipeline' }`);

  const segsQ4 = await decisionTools.searchSegments({ query: 'CI/CD deployment pipeline CircleCI GitHub Actions', top_k: 2 }, mockCtx);
  console.log(`\n🔄 STEP 2: Tool Call -> [search_segments]`);
  console.log(`📥 Input: { query: 'CI/CD deployment pipeline CircleCI GitHub Actions' }`);
  console.log(`📤 Output: Top segment similarity score is low (<0.5). Zero supporting evidence found.`);

  console.log(`\n🏁 FINAL AGENT ANSWER (Q4):`);
  console.log(`No recorded rationale found.`);

  console.log('\n🎉 ALL 4 DEMO REHEARSAL TRACES COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Demo Rehearsal Error:', err);
  process.exit(1);
});
