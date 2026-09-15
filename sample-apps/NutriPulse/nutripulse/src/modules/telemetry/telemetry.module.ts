import { Module } from '@nitrostack/core';
import { telemetryTools } from './telemetry.tools.js';
import { telemetryResources } from './telemetry.resources.js';
import { telemetryPrompts } from './telemetry.prompts.js';

@Module({
  name: 'telemetry',
  description: 'TODO: Add description',
  controllers: [telemetryTools, telemetryResources, telemetryPrompts],
})
export class telemetryModule {}
