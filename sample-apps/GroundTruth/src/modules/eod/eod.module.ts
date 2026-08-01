import { Module } from '@nitrostack/core';
import { EodTools } from './eod.tools.js';
import { EodResources } from './eod.resources.js';
import { EodPrompts } from './eod.prompts.js';

/**
 * The subjective side of GroundTruth: what people say they did, plus the
 * prompts that drive the agent's review of it.
 */
@Module({
  name: 'eod',
  description: 'End-of-day report capture, extraction, digest, and the agent review loop',
  controllers: [EodTools, EodResources, EodPrompts],
})
export class EodModule {}
