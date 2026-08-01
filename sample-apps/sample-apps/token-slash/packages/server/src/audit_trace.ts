import { TokenEstimatorService } from './tools/token-estimator.tool.js';
import { ComplexityClassifierService } from './tools/complexity-classifier.tool.js';
import { ModelRecommenderService } from './tools/model-recommender.tool.js';
import { HistoryAnalyzerService } from './tools/history-analyzer.tool.js';
import { PromptRewriterService } from './orchestration/prompt-rewriter.service.js';
import { MetaSynthesizerService } from './orchestration/meta-synthesizer.service.js';
import { PipelineService } from './orchestration/pipeline.service.js';

const TEST_PROMPT = "I need to analyze quarterly sales data across 5 regions, identify trends, forecast Q4 revenue, and create a 2-slide executive summary. I have 6 months of historical data in CSV format.";
const TEST_USER = "audit-user-001";

console.log("=" .repeat(80));
console.log("TOKENSLASH MCP SERVER — TECHNICAL AUDIT TRACE");
console.log("=" .repeat(80));
console.log(`\nTest Prompt: "${TEST_PROMPT}"`);
console.log(`Prompt Length: ${TEST_PROMPT.length} chars`);
console.log(`User ID: ${TEST_USER}`);

// 1. Token Estimator
console.log("\n" + "─".repeat(80));
console.log("MODULE 1: TOKEN ESTIMATOR");
console.log("─".repeat(80));
const tokenEstimator = new TokenEstimatorService();
const tokenResult = tokenEstimator.estimateTokens(TEST_PROMPT);
console.log(JSON.stringify(tokenResult, null, 2));

// 2. Complexity Classifier
console.log("\n" + "─".repeat(80));
console.log("MODULE 2: COMPLEXITY CLASSIFIER");
console.log("─".repeat(80));
const complexityClassifier = new ComplexityClassifierService();
const complexityResult = complexityClassifier.classifyComplexity(TEST_PROMPT);
console.log(JSON.stringify(complexityResult, null, 2));

// 3. History Analyzer
console.log("\n" + "─".repeat(80));
console.log("MODULE 3: HISTORY ANALYZER");
console.log("─".repeat(80));
const historyAnalyzer = new HistoryAnalyzerService();
const historyResult = historyAnalyzer.analyzeHistory(TEST_USER, TEST_PROMPT);
console.log(JSON.stringify(historyResult, null, 2));

// 4. Model Recommender
console.log("\n" + "─".repeat(80));
console.log("MODULE 4: MODEL RECOMMENDER");
console.log("─".repeat(80));
const modelRecommender = new ModelRecommenderService();
const modelResult = modelRecommender.recommendModel(
  tokenResult.tokenCount,
  complexityResult.complexityScore,
  complexityResult.taskType
);
console.log(JSON.stringify(modelResult, null, 2));

// 5. Prompt Rewriter
console.log("\n" + "─".repeat(80));
console.log("MODULE 5: PROMPT REWRITER");
console.log("─".repeat(80));
const promptRewriter = new PromptRewriterService();
const rewriteResult = promptRewriter.rewritePrompt(TEST_PROMPT, complexityResult.taskType);
console.log(JSON.stringify(rewriteResult, null, 2));

// 6. Full Pipeline (e2e)
console.log("\n" + "─".repeat(80));
console.log("MODULE 6: FULL PIPELINE (E2E)");
console.log("─".repeat(80));
const pipeline = new PipelineService(
  tokenEstimator,
  complexityClassifier,
  modelRecommender,
  historyAnalyzer,
  promptRewriter,
  new MetaSynthesizerService(),
);

const startMs = Date.now();
const pipelineResult = await pipeline.analyzePrompt({ prompt: TEST_PROMPT, userId: TEST_USER });
const elapsedMs = Date.now() - startMs;

console.log(`Pipeline elapsed: ${elapsedMs}ms`);
console.log(JSON.stringify(pipelineResult.finalReport, null, 2));

console.log("\n" + "=" .repeat(80));
console.log("AUDIT TRACE COMPLETE");
console.log("=" .repeat(80));
