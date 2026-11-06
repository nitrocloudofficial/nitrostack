import { Module } from '@nitrostack/core';
import { AnalysisModule } from '../analysis/analysis.module.js';
import { IncidentsModule } from '../incidents/incidents.module.js';
import { RegistryModule } from '../registry/registry.module.js';
import { ObservabilityModule } from '../observability/observability.module.js';
import { BouncerApiKeyGuard } from '../observability/api-key.guard.js';
import { BouncerService } from './bouncer.service.js';
import { ReleaseDiffService } from './release-diff.service.js';
import { BouncerPrompts } from './bouncer.prompts.js';
import { BouncerResources } from './bouncer.resources.js';
import { BouncerTools } from './bouncer.tools.js';

/**
 * The MCP surface: tools, resources and prompts an AI coding agent uses.
 * NitroStack registers imports one level deep, so the feature modules this one depends on
 * are also imported by AppModule; listing them here documents the dependency.
 */
@Module({
  name: 'bouncer',
  description: 'Vet npm releases before an AI agent installs them',
  imports: [RegistryModule, AnalysisModule, IncidentsModule, ObservabilityModule],
  providers: [BouncerService, ReleaseDiffService, BouncerApiKeyGuard],
  controllers: [BouncerTools, BouncerResources, BouncerPrompts],
})
export class BouncerModule {}
