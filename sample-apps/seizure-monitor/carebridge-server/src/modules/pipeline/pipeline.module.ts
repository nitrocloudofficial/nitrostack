import { Module } from '@nitrostack/core';
import { PipelineTools } from './pipeline.tools.js';

/**
 * Pipeline Module - Person 4 Lead
 * Milestone 3: Intelligence Pipeline
 *
 * Connects Guardian AI, Health Intelligence, and Triage AI
 * into one callable end-to-end workflow via orchestrate_carebridge.
 */
@Module({
  name: 'pipeline',
  description: 'CAREBRIDGE AI end-to-end intelligence pipeline module',
  controllers: [PipelineTools],
  providers: [PipelineTools],
  exports: [PipelineTools],
})
export class PipelineModule {}
