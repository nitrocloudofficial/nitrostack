import { Module } from '@nitrostack/core';
import { ScamShieldTools } from './scamshield.tools.js';

@Module({
  name: 'scamshield',
  description: 'AI-powered fraud prevention and scam safety tools',
  controllers: [ScamShieldTools]
})
export class ScamShieldModule {}