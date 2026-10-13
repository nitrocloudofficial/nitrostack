import { Module } from '@nitrostack/core';

import { GuardianTools } from './guardian.tools.js';
import { GuardianResources } from './guardian.resources.js';
import { GuardianPrompts } from './guardian.prompts.js';

@Module({
  name: 'guardian',
  description: 'GuardianSense AI Backend',
  controllers: [
    GuardianTools,
    GuardianResources,
    GuardianPrompts,
  ],
})
export class GuardianModule {}