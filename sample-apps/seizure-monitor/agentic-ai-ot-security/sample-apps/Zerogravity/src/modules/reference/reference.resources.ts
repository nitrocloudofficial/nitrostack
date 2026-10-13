import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { DataService } from '../../shared/services/data.service.js';
import { RareDiseaseRegistryService } from '../../shared/services/rare-disease-registry.service.js';
import { Injectable } from '@nitrostack/core';

/**
 * Reference Resources
 * 
 * Provides access to reference data including patient medical histories
 * and rare disease treatment registries
 */
@Injectable({ deps: [DataService, RareDiseaseRegistryService] })
export class ReferenceResources {
  constructor(
    private dataService: DataService,
    private rareDiseaseRegistryService: RareDiseaseRegistryService,
  ) {}

  @Resource({
    uri: 'reference://patient-history',
    name: 'Patient History',
    description: 'Retrieve a patient\'s medical history including medications, allergies, conditions, and past reactions',
    mimeType: 'application/json',
  })
  async patientHistory(context: ExecutionContext) {
    // This resource is typically accessed via the audit_medication_safety tool
    // which passes the patientId as a parameter. Here we return a generic message.
    return {
      type: 'text' as const,
      text: JSON.stringify({
        message: 'Patient history resource. Use the audit_medication_safety tool to retrieve specific patient data.',
        note: 'This resource provides access to patient medical histories for medication safety audits.',
      }, null, 2),
    };
  }

  @Resource({
    uri: 'reference://rare-disease-registry',
    name: 'Rare Disease Registry',
    description: 'Query the rare disease registry for verified, evidence-backed treatments for rare conditions. Returns structured drug profiles with clinical evidence levels and citations.',
    mimeType: 'application/json',
  })
  async rareDiseaseRegistry(context: ExecutionContext) {
    // Return registry metadata and usage instructions
    const stats = this.rareDiseaseRegistryService.getRegistryStats();
    return {
      type: 'text' as const,
      text: JSON.stringify({
        message: 'Rare Disease Registry Resource',
        description: 'Use the fetch_proven_drug_data tool to query this registry for verified treatments.',
        stats,
        note: 'This resource provides access to curated, evidence-backed treatments for rare diseases from NIH, FDA, and Orphanet sources.',
      }, null, 2),
    };
  }

  @Resource({
    uri: 'reference://example',
    name: 'Example Resource',
    description: 'TODO: Add description',
    mimeType: 'application/json',
  })
  async exampleResource(context: ExecutionContext) {
    // TODO: Implement resource logic
    return {
      type: 'text' as const,
      text: JSON.stringify({ example: 'data' }, null, 2),
    };
  }
}
