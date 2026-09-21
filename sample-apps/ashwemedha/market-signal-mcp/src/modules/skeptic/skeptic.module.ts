import { Module } from '@nitrostack/core';
import { SkepticTools } from './skeptic.tools.js';
import { VerdictLogResources } from './verdict-log.resource.js';

@Module({
  name: 'skeptic',
  description:
    'Skeptic Agent: source credibility check, recycled content check, volume context check, ' +
    'narrative entropy detection, adversarial verdict generation. Owns the verdict_log Resource.',
  controllers: [SkepticTools, VerdictLogResources],
})
export class SkepticModule {}
