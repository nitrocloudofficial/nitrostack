/**
 * End-to-end smoke test — runs the pipeline without starting the MCP server.
 * Usage: npm run smoke
 */
import { MetaSynthesizerService } from '../src/orchestration/meta-synthesizer.service.js';
import { PipelineService } from '../src/orchestration/pipeline.service.js';
import { PromptRewriterService } from '../src/orchestration/prompt-rewriter.service.js';
import { ComplexityClassifierService } from '../src/tools/complexity-classifier.tool.js';
import { HistoryAnalyzerService } from '../src/tools/history-analyzer.tool.js';
import { ModelRecommenderService } from '../src/tools/model-recommender.tool.js';
import { TokenEstimatorService } from '../src/tools/token-estimator.tool.js';

const modelRecommender = new ModelRecommenderService();

const pipeline = new PipelineService(
  new TokenEstimatorService(),
  new ComplexityClassifierService(),
  modelRecommender,
  new HistoryAnalyzerService(modelRecommender),
  new PromptRewriterService(),
  new MetaSynthesizerService(),
);

const { finalReport } = await pipeline.analyzePrompt({
  prompt:
    'Please kindly I would like you to write a Python function that sorts a list in ascending order.',
  userId: 'demo-user',
});

console.log(JSON.stringify(finalReport, null, 2));

const requiredFields = [
  'originalPrompt',
  'optimizedPrompt',
  'tokenSavingsPercent',
  'recommendedModel',
  'costComparison',
  'monthlySavings',
  'generatedAt',
] as const;

for (const field of requiredFields) {
  if (finalReport[field] === undefined || finalReport[field] === null) {
    console.error(`FAIL: missing required field "${field}"`);
    process.exit(1);
  }
}

console.log('\n✓ Smoke test passed — all required FinalReport fields populated.');
