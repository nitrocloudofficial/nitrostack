import { Module } from '@nitrostack/core';
import { PipelineTools } from './pipeline.tools.js';
import { RiskModule } from '../risk/risk.module.js';
import { GraphModule } from '../graph/graph.module.js';
import { RedactionModule } from '../redaction/redaction.module.js';
import { IngestionModule } from '../ingestion/ingestion.module.js';

@Module({
  name: 'pipeline',
  imports: [RiskModule, GraphModule, RedactionModule, IngestionModule],
  providers: [PipelineTools],
  controllers: [PipelineTools]
})
export class PipelineModule {}
