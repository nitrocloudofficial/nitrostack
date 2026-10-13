import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { HistoryService } from './history.service.js';

const GetPatientHistorySchema = z.object({
  patientId: z.string().describe('The EHR Patient ID to query')
});

const CreatePatientSchema = z.object({
  name: z.string(),
  age: z.number(),
  gender: z.string(),
  dateOfBirth: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string()
  }),
  insurance: z.object({
    provider: z.string(),
    policyNumber: z.string(),
    groupNumber: z.string()
  }),
  lifestyle: z.object({
    smoking: z.enum(['Never', 'Former', 'Current', 'Chain Smoker']),
    alcohol: z.enum(['None', 'Occasional', 'Moderate', 'Heavy']),
    exercise: z.string(),
    diet: z.string()
  }),
  familyHistory: z.array(z.string()),
  pastSurgeries: z.array(z.string()),
  conditions: z.array(z.string()),
  allergies: z.array(z.string()),
  medications: z.array(z.string()),
  recentLabs: z.array(z.string()),
  riskCategory: z.enum(['CRITICAL RISK', 'HIGH RISK', 'MODERATE RISK', 'LOW RISK'])
});

@Injectable({ deps: [HistoryService] })
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Tool({
    name: 'get_all_patients',
    description: 'Retrieve all patient profiles in the hospital EMR system.',
    inputSchema: z.object({})
  })
  async getAllPatients(args: any, ctx: ExecutionContext) {
    ctx.logger.info(`📋 [History Agent] Fetching all patient records in hospital EMR...`);
    const patients = this.historyService.getAllPatients();
    return {
      status: 'success',
      agent: 'History Agent',
      count: patients.length,
      patients
    };
  }

  @Tool({
    name: 'get_patient_profile',
    description: 'Retrieve full digital folder and permanent profile for a specific patient by ID.',
    inputSchema: GetPatientHistorySchema
  })
  async getPatientProfile(args: z.infer<typeof GetPatientHistorySchema>, ctx: ExecutionContext) {
    ctx.logger.info(`👤 [History Agent] Fetching full profile for patient ${args.patientId}...`);
    const profile = this.historyService.getPatientProfile(args.patientId);
    return {
      status: 'success',
      agent: 'History Agent',
      profile
    };
  }

  @Tool({
    name: 'get_patient_history',
    description: 'Retrieve Electronic Health Record (EHR) medical history, chronic conditions, known allergies, and active medications for a patient.',
    inputSchema: GetPatientHistorySchema
  })
  async getPatientHistory(args: z.infer<typeof GetPatientHistorySchema>, ctx: ExecutionContext) {
    ctx.logger.info(`🔍 [History Agent] Fetching EHR records for patient ${args.patientId}...`);
    const history = this.historyService.getPatientHistory(args.patientId);
    return {
      status: 'success',
      agent: 'History Agent',
      data: history
    };
  }

  @Tool({
    name: 'create_patient',
    description: 'Onboard a new patient and create a permanent EMR digital folder.',
    inputSchema: CreatePatientSchema
  })
  async createPatient(args: z.infer<typeof CreatePatientSchema>, ctx: ExecutionContext) {
    ctx.logger.info(`➕ [History Agent] Creating new patient profile for ${args.name}...`);
    const created = this.historyService.createPatient(args);
    return {
      status: 'success',
      agent: 'History Agent',
      patient: created
    };
  }
}
