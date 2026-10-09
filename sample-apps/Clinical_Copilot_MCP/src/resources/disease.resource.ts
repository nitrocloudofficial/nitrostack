import { Injectable, ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * Clinical Copilot MCP Server - Disease Resources
 *
 * Exposes medical terminology, ICD-10 codes, and disease ontology reference data.
 */
@Injectable()
export class DiseaseResources {
  @Resource({
    uri: 'clinical://disease/{id}',
    name: 'Disease Knowledge Base',
    description: 'Exposes ICD-10 disease codes, clinical descriptions, and diagnostic criteria.',
    mimeType: 'application/json',
  })
  async getDiseaseOntology(ctx: ExecutionContext) {
    return {
      icd10Code: 'E11.9',
      name: 'Type 2 Diabetes Mellitus without complications',
      category: 'Endocrine, nutritional and metabolic diseases',
      description: 'A chronic condition that affects the way the body processes blood sugar (glucose).',
      commonSymptoms: ['Increased thirst', 'Frequent urination', 'Increased hunger', 'Fatigue'],
    };
  }
}
