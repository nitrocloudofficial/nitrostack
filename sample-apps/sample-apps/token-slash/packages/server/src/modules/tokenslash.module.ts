import { HealthCheck, HealthCheckInterface, HealthCheckResult, Module } from '@nitrostack/core';
import { PipelineService } from '../orchestration/pipeline.service.js';
import { MetaSynthesizerService } from '../orchestration/meta-synthesizer.service.js';
import { PromptRewriterService } from '../orchestration/prompt-rewriter.service.js';
import { ComplexityClassifierService } from '../tools/complexity-classifier.tool.js';
import { HistoryAnalyzerService, HistoryAnalyzerTool } from '../tools/history-analyzer.tool.js';
import { MetaSynthesizerTools } from '../tools/meta-synthesizer.tool.js';
import { ModelRecommenderService, ModelRecommenderTool } from '../tools/model-recommender.tool.js';
import { OrchestrationTools } from '../tools/orchestration.tool.js';
import { PromptRewriterTools } from '../tools/prompt-rewriter.tool.js';
import { TokenEstimatorService } from '../tools/token-estimator.tool.js';

@HealthCheck({ name: 'server_health', description: 'TokenSlash Server Live Health Check' })
export class ServerHealthCheck implements HealthCheckInterface {
  check(): HealthCheckResult {
    return { status: 'up', message: 'TokenSlash Server is healthy' };
  }
}

@Module({
  name: 'tokenslash',
  description:
    'TokenSlash — token analysis, model recommendation, and prompt optimization pipeline',
  controllers: [
    OrchestrationTools,
    PromptRewriterTools,
    MetaSynthesizerTools,
    ModelRecommenderTool,
    HistoryAnalyzerTool,
  ],
  providers: [
    ServerHealthCheck,
    PipelineService,
    PromptRewriterService,
    MetaSynthesizerService,
    TokenEstimatorService,
    ComplexityClassifierService,
    ModelRecommenderService,
    HistoryAnalyzerService,
  ],
  exports: [PipelineService],
})
export class TokenSlashModule {}
