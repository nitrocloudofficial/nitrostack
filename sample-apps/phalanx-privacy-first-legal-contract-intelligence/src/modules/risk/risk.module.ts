import { Module } from '@nitrostack/core';
import { RiskTools } from './risk.tools.js';
import { RedlineTools } from './redline.tools.js';
import { RiskService } from './risk.service.js';
import { RedlineService } from './redline.service.js';
import { GraphModule } from '../graph/graph.module.js';
import { RedactionModule } from '../redaction/redaction.module.js';
import { LlmModule } from '../llm/llm.module.js';

@Module({
  name: 'risk',
  imports: [GraphModule, RedactionModule, LlmModule],
  controllers: [RiskTools, RedlineTools],
  providers: [RiskService, RedlineService],
  exports: [RiskService, RedlineService]
})
export class RiskModule {}
