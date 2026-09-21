import { McpApp, Module } from '@nitrostack/core';
import { IngestionModule } from './modules/ingestion/ingestion.module.js';
import { RedactionModule } from './modules/redaction/redaction.module.js';
import { GraphModule } from './modules/graph/graph.module.js';
import { RiskModule } from './modules/risk/risk.module.js';
import { BenchmarkModule } from './modules/benchmark/benchmark.module.js';
import { PipelineModule } from './modules/pipeline/pipeline.module.js';
import { CalculatorModule } from './modules/calculator/calculator.module.js';
import { ContractResources } from './resources/contract.resources.js';

@Module({
  name: 'phalanx-app',
  imports: [
    IngestionModule,
    RedactionModule,
    GraphModule,
    RiskModule,
    BenchmarkModule,
    PipelineModule,
    CalculatorModule
  ],
  providers: [],
  controllers: [ContractResources]
})
export class AppLogicModule {}

@McpApp({
  module: AppLogicModule,
  server: { name: 'phalanx-server', version: '1.0.0' }
})
export class AppModule {}
