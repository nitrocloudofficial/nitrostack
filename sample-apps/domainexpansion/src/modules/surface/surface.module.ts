import { Module } from '@nitrostack/core';
import { SurfaceStateService } from './state.js';
import { SurfaceTools } from './surface.tools.js';
import { SurfaceResources } from './surface.resources.js';
import { SurfacePrompts } from './surface.prompts.js';

@Module({
  name: 'surface',
  description: 'API attack-surface reconstruction: ingest access logs, diff against an OpenAPI spec, and report authorization risk with citable evidence.',
  controllers: [SurfaceTools, SurfaceResources, SurfacePrompts],
  providers: [SurfaceStateService],
})
export class SurfaceModule {}
