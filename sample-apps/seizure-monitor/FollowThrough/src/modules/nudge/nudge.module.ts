import { Module } from '@nitrostack/core';
import { NudgeService } from './nudge.service.js';
import { NudgeTools } from './nudge.tools.js';

@Module({
  name: 'nudge',
  description: 'Contextual reminder sending with calibrated tones',
  controllers: [NudgeTools],
  providers: [NudgeService],
})
export class NudgeModule {}
