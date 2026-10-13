import { Module, ToolDecorator as Tool, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { Incident } from '../fixtures/types.js';

export const INCIDENTS_DB = new Map<string, Incident>();

@Injectable()
export class IncidentsTools {
  @Tool({
    name: 'create_incident',
    description: 'Save a new incident in in-memory storage.',
    inputSchema: z.object({
      accidentType: z.enum(['motor', 'injury']),
      incidentDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid ISO date" }),
      incidentTime: z.string(),
      location: z.string().min(3),
      policyType: z.enum(['motor-basic', 'motor-premium', 'health-addon']),
      policyNumber: z.string().optional(),
      vehicleRegistration: z.string().optional(),
      drivingLicenceAvailable: z.boolean(),
      injuryReported: z.boolean(),
      firAvailable: z.boolean(),
      hospitalBillAvailable: z.boolean(),
      hospitalEstimateAvailable: z.boolean(),
      notes: z.string().optional(),
      state: z.string().optional().default('TamilNadu'),
      hasInjuries: z.boolean().optional(),
      hasFIR: z.boolean().optional(),
      hasDrivingLicence: z.boolean().optional(),
      policyExpiryDate: z.string().optional(),
      estimatedDamage: z.number().optional(),
      hasSurveyor: z.boolean().optional(),
      treatmentType: z.enum(['cashless', 'reimbursement']).optional(),
      hasPreAuthorization: z.boolean().optional(),
    }) as any
  })
  async createIncident(
    input: {
      accidentType: 'motor' | 'injury';
      incidentDate: string;
      incidentTime: string;
      location: string;
      policyType: 'motor-basic' | 'motor-premium' | 'health-addon';
      policyNumber?: string;
      vehicleRegistration?: string;
      drivingLicenceAvailable: boolean;
      injuryReported: boolean;
      firAvailable: boolean;
      hospitalBillAvailable: boolean;
      hospitalEstimateAvailable: boolean;
      notes?: string;
      state?: string;
      hasInjuries?: boolean;
      hasFIR?: boolean;
      hasDrivingLicence?: boolean;
      policyExpiryDate?: string;
      estimatedDamage?: number;
      hasSurveyor?: boolean;
      treatmentType?: 'cashless' | 'reimbursement';
      hasPreAuthorization?: boolean;
    }
  ) {
    const id = Math.random().toString(36).substring(2, 9);
    const newIncident: Incident = { id, createdAt: new Date().toISOString(), ...input };
    INCIDENTS_DB.set(id, newIncident);
    return {
      incident: newIncident,
      nextRecommendedTool: 'assess_urgency',
      approvalRequired: true,
      disclaimer: "Demo guidance only. This does not provide medical, legal, or insurance claim advice and does not determine claim eligibility."
    };
  }
}

@Module({
  name: 'IncidentsModule',
  controllers: [IncidentsTools]
})
export class IncidentsModule {}
