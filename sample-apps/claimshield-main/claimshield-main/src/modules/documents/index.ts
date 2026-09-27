import { Module, ToolDecorator as Tool, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { INCIDENTS_DB } from '../incidents/index.js';
import { DEMO_POLICIES, DISCLAIMER } from '../fixtures/data.js';
import { Incident } from '../fixtures/types.js';

export function determineDocuments(incident: Incident) {
  const policy = DEMO_POLICIES[incident.policyType];
  const requiredDocuments = [...policy.requiredDocuments];
  const conditionalRequirements: string[] = [];

  if (policy.conditionalDocuments) {
    for (const cond of policy.conditionalDocuments) {
      let meetsCondition = false;
      if (cond.condition === 'accident involves injury or major damage' && incident.injuryReported) meetsCondition = true;
      if (cond.condition === 'hospital visit' && incident.injuryReported) meetsCondition = true;
      if (cond.condition === 'admitted' && incident.injuryReported) meetsCondition = true;
      
      if (meetsCondition) {
        requiredDocuments.push(...cond.documents);
        conditionalRequirements.push(`Added ${cond.documents.join(', ')} because ${cond.condition}`);
      }
    }
  }

  const availableDocuments: string[] = [];
  if (incident.policyNumber) availableDocuments.push('policy number');
  if (incident.vehicleRegistration) availableDocuments.push('vehicle registration');
  if (incident.drivingLicenceAvailable) availableDocuments.push('driving licence');
  if (incident.firAvailable) availableDocuments.push('FIR');
  if (incident.hospitalBillAvailable || incident.hospitalEstimateAvailable) availableDocuments.push('hospital bill or estimate');
  const uniqueAvailable = Array.from(new Set(availableDocuments));

  const missingDocuments = requiredDocuments.filter(doc => !uniqueAvailable.includes(doc));
  return { requiredDocuments, availableDocuments: uniqueAvailable, missingDocuments, conditionalRequirements };
}

@Injectable()
export class DocumentsTools {
  @Tool({
    name: 'get_required_documents',
    description: 'Compare incident data with fixture policy requirements to find missing documents.',
    inputSchema: z.object({
      incidentId: z.string(),
    }) as any
  })
  async getRequiredDocuments(input: { incidentId: string }) {
    const incident = INCIDENTS_DB.get(input.incidentId);
    if (!incident) throw new Error("Incident not found");

    const docs = determineDocuments(incident);
    return { ...docs, disclaimer: DISCLAIMER };
  }
}

@Module({
  name: 'DocumentsModule',
  controllers: [DocumentsTools]
})
export class DocumentsModule {}
