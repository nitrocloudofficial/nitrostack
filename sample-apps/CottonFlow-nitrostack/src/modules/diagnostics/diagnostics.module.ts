import { Module } from '@nitrostack/core';
import { DiagnosticsTools } from './diagnostics.tools.js';
import { DiagnosticsResources } from './diagnostics.resources.js';
import { DiagnosticsPrompts } from './diagnostics.prompts.js';
import { FactoryStateService } from './factory-state.service.js';

@Module({
  name: 'diagnostics',
  description: 'Factory diagnostics module for monitoring machine health, environmental conditions, and production status',
  controllers: [DiagnosticsTools, DiagnosticsResources, DiagnosticsPrompts],
  providers: [FactoryStateService],
})
export class DiagnosticsModule {}
