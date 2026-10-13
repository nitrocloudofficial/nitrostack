import { Module } from '@nitrostack/core';
import { ClinicalResourcesService } from './clinical.resources.js';

@Module({
  name: 'clinical-resources',
  description: 'Module exposing 11 readable clinical data MCP resources for patients, consultations, lab results, and research.',
  controllers: [ClinicalResourcesService],
  providers: [ClinicalResourcesService],
  exports: [ClinicalResourcesService]
})
export class ResourcesModule {}
