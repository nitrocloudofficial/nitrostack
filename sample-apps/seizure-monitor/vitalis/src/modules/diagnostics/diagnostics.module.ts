import { Module } from '@nitrostack/core';
import { DiagnosticsTools } from './diagnostics.tools.js';
import { DiagnosticsService } from './diagnostics.service.js';
import { IntegrationsModule } from '../../integrations/integrations.module.js';

@Module({
  name: 'diagnostics',
  description: 'Diagnostics Support module — ICD-10 lookup, lab value interpretation, lab test explanations',
  imports: [IntegrationsModule],
  controllers: [DiagnosticsTools],
  providers: [DiagnosticsService],
  exports: [DiagnosticsService],
})
export class DiagnosticsModule {}
