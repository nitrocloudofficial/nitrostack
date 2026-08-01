import { Module } from '@nitrostack/core';
import { HttpClientService } from './http-client.service.js';
import { RxNormService } from './rxnorm.service.js';
import { OpenFdaService } from './openfda.service.js';
import { PubMedService } from './pubmed.service.js';
import { ClinicalTrialsService } from './clinicaltrials.service.js';
import { ClinicalTablesService } from './clinicaltables.service.js';
import { FhirService } from './fhir.service.js';
import { WhoIcdService } from './who-icd.service.js';

/**
 * Integrations Module — outbound HTTP layer and per-API services.
 */
@Module({
  name: 'integrations',
  description: 'External API integration layer',
  providers: [
    HttpClientService,
    RxNormService,
    OpenFdaService,
    PubMedService,
    ClinicalTrialsService,
    ClinicalTablesService,
    FhirService,
    WhoIcdService,
  ],
  exports: [
    HttpClientService,
    RxNormService,
    OpenFdaService,
    PubMedService,
    ClinicalTrialsService,
    ClinicalTablesService,
    FhirService,
    WhoIcdService,
  ],
})
export class IntegrationsModule {}
