import { Module } from '@nitrostack/core';
import { ReportResources, ReportTools } from './report.tools.js';

@Module({
  name: 'report',
  description: 'Generate PDF, SARIF and CycloneDX SBOM reports from an assessment',
  controllers: [ReportTools, ReportResources]
})
export class ReportModule {}
