import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { PATIENT_RECORD, PHARMACY_DATABASE } from '../data/mockData.js';

export class HealthTools {
  
  @Tool({
    name: 'get_patient_timeline',
    description: 'Fetch unified patient medical history, allergies, and lab trends',
    inputSchema: z.object({
      patientId: z.string().describe('Unique patient identifier, e.g., PAT-101'),
    }),
  })
  @Widget('patient-timeline-card')
  async getPatientTimeline(input: { patientId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Executing get_patient_timeline', { patientId: input.patientId });
    if (input.patientId === PATIENT_RECORD.id || input.patientId === 'PAT-101') {
      return PATIENT_RECORD;
    }
    return { ...PATIENT_RECORD, id: input.patientId };
  }

  @Tool({
    name: 'check_medicine_sourcing',
    description: 'Check medicine stock, local pharmacy prices, and generic alternatives',
    inputSchema: z.object({
      medicineName: z.string().describe('Name of prescribed medication, e.g., Atorvastatin 20mg'),
    }),
  })
  @Widget('medicine-sourcing-card')
  async checkMedicineSourcing(input: { medicineName: string }, ctx: ExecutionContext) {
    ctx.logger.info('Executing check_medicine_sourcing', { medicineName: input.medicineName });
    const data = PHARMACY_DATABASE[input.medicineName];
    if (data) {
      return data;
    }
    return {
      drugName: input.medicineName,
      brandName: input.medicineName,
      hospitalStock: 0,
      hospitalPrice: 500,
      apolloPrice: 450,
      nearbyStorePrice: 400,
      genericOption: {
        name: `${input.medicineName} (Generic)`,
        price: 150,
        savings: '70% cheaper',
        doctorApproved: true
      },
      deliveryEstimate: '30 minutes',
      refillDaysRemaining: 30
    };
  }

  @Tool({
    name: 'check_drug_safety',
    description: 'Evaluate if a prescribed medicine interacts with patient allergies',
    inputSchema: z.object({
      patientId: z.string().describe('Patient ID'),
      drugName: z.string().describe('Name of medication to check'),
    }),
  })
  async checkDrugSafety(input: { patientId: string; drugName: string }, ctx: ExecutionContext) {
    ctx.logger.info('Evaluating drug safety', input);
    const hasAllergy = PATIENT_RECORD.allergies.some((allergy) =>
      input.drugName.toLowerCase().includes(allergy.toLowerCase())
    );

    if (hasAllergy) {
      return {
        safe: false,
        status: 'CRITICAL_ALLERGY_WARNING',
        message: `WARNING: Patient ${input.patientId} is severely allergic to ${input.drugName}!`,
        recommendedAction: 'Do not administer. Consult attending physician for alternatives.'
      };
    }

    return {
      safe: true,
      status: 'CLEAR',
      message: `Medication ${input.drugName} is safe for patient ${input.patientId}.`,
      recommendedAction: 'Proceed with prescription.'
    };
  }
}