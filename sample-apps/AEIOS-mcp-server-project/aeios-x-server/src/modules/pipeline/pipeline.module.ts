import { Module } from '@nitrostack/core';
import { PipelineTools } from './pipeline.tools.js';
import { PipelineResources } from './pipeline.resources.js';
import { PipelinePrompts } from './pipeline.prompts.js';

@Module({
  name: 'pipeline',
  description: 'AEIOS-X Enterprise AI Pipeline - multi-agent orchestration, consensus, and decision engine',
  controllers: [PipelineTools, PipelineResources, PipelinePrompts],
})
export class PipelineModule {}
