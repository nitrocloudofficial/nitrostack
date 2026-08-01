import { Module } from '@nitrostack/core';
import { DemoTools } from './demo.tools.js';
import { DemoAutoSeed } from './demo.bootstrap.js';

/**
 * Demo setup helpers. Separate from the feature modules so it is one line in
 * app.module.ts to remove if this ever became a real deployment.
 */
@Module({
  name: 'demo',
  description: 'Seeding and reset helpers for demoing GroundTruth',
  controllers: [DemoTools],
  providers: [DemoAutoSeed],
})
export class DemoModule {}
