import { Module } from '@nitrostack/core';
import { ConcordTools } from './concord.tools.js';
import { ConcordResources } from './concord.resources.js';
import { ConcordPrompts } from './concord.prompts.js';

@Module({
  name: 'concord',
  description: 'Cross-departmental governance agent — DevOps, SecOps, and FinOps with human-in-the-loop approval for high-risk actions.',
  controllers: [ConcordTools, ConcordResources, ConcordPrompts]
})
export class ConcordModule {}
