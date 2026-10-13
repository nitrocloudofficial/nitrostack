import { ScoutTools } from './modules/scout/scout.tools.js';
import { AnalystTools } from './modules/analyst/analyst.tools.js';
import { SkepticTools } from './modules/skeptic/skeptic.tools.js';
import { readAllFindings } from './modules/scout/findings-board.resource.js';
import { readLatestSignal } from './modules/analyst/signal-log.resource.js';
import { readLatestVerdict } from './modules/skeptic/verdict-log.resource.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function runPipeline() {
  console.log('===============================================================');
  console.log('🚀 Multi-Agent News-Driven Market Signal System Pipeline');
  console.log('===============================================================');

  const tickers = ['AAPL', 'TSLA', 'NVDA', 'BTC'];
  const mockCtx = {
    logger: {
      info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta ? JSON.stringify(meta) : ''),
      warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta ? JSON.stringify(meta) : ''),
      error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta ? JSON.stringify(meta) : ''),
    },
  };

  const scout = new ScoutTools();
  const analyst = new AnalystTools();
  const skeptic = new SkepticTools();

  console.log('\n--- Step 1: Scout Agent (scan_trending_topics) ---');
  await scout.scanTrendingTopics({ tickers }, mockCtx as any);

  console.log('\n--- Step 2: Analyst Agent (assess_signal_strength) ---');
  for (const ticker of tickers) {
    await analyst.assessSignalStrengthTool({ ticker }, mockCtx as any);
  }

  console.log('\n--- Step 3: Skeptic Agent (generate_verdict) ---');
  for (const ticker of tickers) {
    await skeptic.generateVerdictTool({ ticker }, mockCtx as any);
  }

  console.log('\n===============================================================');
  console.log('📊 FINAL PIPELINE SUMMARY & BLACKBOARD VERDICTS');
  console.log('===============================================================');

  for (const ticker of tickers) {
    const signal = readLatestSignal(ticker);
    const verdict = readLatestVerdict(ticker);

    console.log(`\n🔹 TICKER: ${ticker}`);
    console.log(`  Signal Score:      ${signal?.signal_score ?? 'N/A'}/100 (${signal?.signal_direction?.toUpperCase() ?? 'N/A'})`);
    console.log(`  Price Reaction:    ${signal?.price_reaction}`);
    console.log(`  Final Verdict:     ${verdict?.final_verdict?.toUpperCase() ?? 'N/A'}`);
    console.log(`  Verdict Reasoning: ${verdict?.verdict_reasoning}`);
    if (verdict?.challenges_raised?.length) {
      console.log(`  Challenges:        ${verdict.challenges_raised.join(' | ')}`);
    }
  }

  console.log('\n✅ Pipeline execution complete. Resources updated in findings_board, signal_log, and verdict_log.');
}

runPipeline().catch(console.error);
