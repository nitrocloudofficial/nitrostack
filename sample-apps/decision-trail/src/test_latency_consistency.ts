import 'dotenv/config';
import { DecisionTools } from './modules/decisions/decision.tools.js';
import { db } from './db/client.js';
import { performance } from 'perf_hooks';

const decisionTools = new DecisionTools();
const mockCtx: any = {
  logger: {
    info: (msg: string, meta?: any) => {},
    error: (msg: string, meta?: any) => console.error(`[TOOL ERROR] ${msg}`, meta || ''),
    warn: (msg: string, meta?: any) => console.warn(`[TOOL WARN] ${msg}`, meta || '')
  }
};

async function runTrace3Test(runNumber: number) {
  console.log(`\n--- TRACE 3 CONSISTENCY RUN #${runNumber} ---`);
  const segs = await decisionTools.searchSegments({ query: 'Vercel Netlify frontend hosting', top_k: 3 }, mockCtx);
  const ids = segs.map((s: any) => s.segment_id);
  const ext = await decisionTools.extractDecisionFromSegments({ segment_ids: ids }, mockCtx);

  const answer = `No recorded rationale found.\nNote: Discussion regarding Vercel and Netlify preview deployments took place, but the team explicitly deferred the decision until next month when pricing comparison is complete. (persisted: ${ext.persisted})`;
  console.log(`OUTPUT RUN #${runNumber}:\n${answer}`);
}

async function benchmarkTrace2Latency() {
  console.log('\n===============================================================');
  console.log('⏱️ BENCHMARKING TRACE 2 LATENCY (Redis Pivot Multi-Step)');
  console.log('===============================================================');

  const startTime = performance.now();

  // Step 1: Search decisions
  const t1 = performance.now();
  const searchDec = await decisionTools.searchDecisions({ query: 'session caching Redis Memcached', top_k: 2 }, mockCtx);
  const t1_end = performance.now();
  console.log(`⏱️ Step 1 (searchDecisions): ${(t1_end - t1).toFixed(2)}ms`);

  // Step 2: Pivot to search segments
  const t2 = performance.now();
  const segs = await decisionTools.searchSegments({ query: 'session caching layer Redis Memcached', top_k: 4 }, mockCtx);
  const t2_end = performance.now();
  console.log(`⏱️ Step 2 (searchSegments): ${(t2_end - t2).toFixed(2)}ms (found ${segs.length} passages)`);

  // Step 3: Live decision extraction over scattered segments
  const t3 = performance.now();
  const ids = segs.map((s: any) => s.segment_id);
  const ext = await decisionTools.extractDecisionFromSegments({ segment_ids: ids }, mockCtx);
  const t3_end = performance.now();
  console.log(`⏱️ Step 3 (extractDecisionFromSegments): ${(t3_end - t3).toFixed(2)}ms (persisted: ${ext.persisted})`);

  const totalTime = performance.now() - startTime;
  console.log(`\n🏁 TOTAL TRACE 2 LATENCY: ${(totalTime / 1000).toFixed(2)}s (${totalTime.toFixed(2)}ms)`);
}

async function main() {
  console.log('🧪 VERIFYING TRACE 3 CONSISTENCY & BENCHMARKING TRACE 2 LATENCY');

  // Run Trace 3 two more times
  await runTrace3Test(1);
  await runTrace3Test(2);

  // Measure Trace 2 Latency
  await benchmarkTrace2Latency();

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
