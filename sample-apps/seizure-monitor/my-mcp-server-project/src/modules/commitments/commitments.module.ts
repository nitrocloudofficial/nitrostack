import { Module } from '@nitrostack/core';
import { CommitmentsTools } from './commitments.tools.js';
import { CommitmentsResources } from './commitments.resources.js';
import { CommitmentsPrompts } from './commitments.prompts.js';

@Module({
  name: 'commitments',
  description: 'Meeting commitment tracking module',
  controllers: [
    CommitmentsTools,
    CommitmentsResources,
    CommitmentsPrompts,
  ],
})
export class CommitmentsModule {}