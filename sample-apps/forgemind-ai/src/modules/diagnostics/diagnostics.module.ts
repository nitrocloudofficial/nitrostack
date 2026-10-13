import { Module } from '@nitrostack/core';
import { DiagnosticsTools } from './diagnostics.tools.js';

@Module({
  name: 'diagnostics',
  description: 'Factory diagnostics module - health scoring, failure prediction, root cause analysis',
  controllers: [DiagnosticsTools]
})
export class DiagnosticsModule {}
