import { Module } from '@nitrostack/core';
import { PipelineTools } from './pipeline.tools.js';
import { PipelineService } from './pipeline.service.js';
import { EffectsService } from './effects.service.js';

@Module({
  name: 'pipeline',
  description: 'Visual SDLC pipeline builder and executor',
  controllers: [PipelineTools],
  providers: [PipelineService, EffectsService],
  exports: [PipelineService, EffectsService],
})
export class PipelineModule {}
