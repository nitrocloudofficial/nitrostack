import { Module } from '@nitrostack/core';
import { PipelineTools } from './pipeline.tools.js';
import { PipelineResources } from './pipeline.resources.js';
import { PipelinePrompts } from './pipeline.prompts.js';
import { PipelineService } from './pipeline.service.js';

@Module({
  name: 'pipeline',
  description: 'AEIOS-X Enterprise AI Pipeline — multi-agent orchestration, consensus, and decision engine',
  controllers: [PipelineTools, PipelineResources, PipelinePrompts],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
