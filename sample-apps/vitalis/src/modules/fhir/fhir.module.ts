import { Module } from '@nitrostack/core';
import { FhirTools } from './fhir.tools.js';
import { IntegrationsModule } from '../../integrations/integrations.module.js';

@Module({
  name: 'fhir',
  description: 'FHIR Patient Records module — synthetic FHIR R4 interoperability layer',
  imports: [IntegrationsModule],
  controllers: [FhirTools],
  providers: [],
  exports: [],
})
export class FhirModule {}
