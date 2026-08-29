/**
 * FhirTools — FHIR Patient Records module tools.
 * Connects to HAPI FHIR R4 synthetic patient server.
 */
import {
  ToolDecorator as Tool,
  Widget,
  ExecutionContext,
  Injectable,
  ControllerDecorator as Controller,
  RateLimit,
  z,
} from '@nitrostack/core';
import { FhirService } from '../../integrations/fhir.service.js';
import { UseClinicalGateway } from '../../gateway/clinical-gateway.decorator.js';
import { Cache } from '../../gateway/cache.decorator.js';

@Controller('fhir')
@Injectable({ deps: [FhirService] })
export class FhirTools {
  constructor(private readonly fhirService: FhirService) {}

  @Tool({
    name: 'search_patients',
    description: 'Search synthetic FHIR R4 patients by name, gender, or birthdate.',
    inputSchema: z
      .object({
        name: z.string().optional().describe('Patient name search string'),
        gender: z.enum(['male', 'female']).optional().describe('Biological sex filter'),
        birthdate: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/).optional().describe('Birth date (YYYY, YYYY-MM, or YYYY-MM-DD)'),
        max_results: z.number().int().min(1).max(25).default(10).describe('Max results to return'),
      })
      .refine((data) => data.name || data.gender || data.birthdate, {
        message: 'At least one search parameter (name, gender, or birthdate) must be provided.',
      }),
    examples: {
      request: { name: 'Alex', max_results: 5 },
      response: {
        patients: [{ fhir_id: '12345', name: 'Alex Morgan', gender: 'male', birth_date: '1980-05-15', mrn: 'MRN987' }],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({
    ttl: 300,
    key: (input: any) =>
      `fhir_search:${input.name ?? ''}:${input.gender ?? ''}:${input.birthdate ?? ''}:${input.max_results ?? 10}`,
  })
  @RateLimit({ requests: 20, window: '1m' })
  async searchPatients(input: any, ctx: ExecutionContext) {
    ctx.logger.info('fhir_search_patients', { name: input.name });
    const result = await this.fhirService.searchPatients({
      name: input.name,
      gender: input.gender,
      birthdate: input.birthdate,
      maxResults: input.max_results ?? 10,
    });

    return {
      ...result,
      _safety: {
        disclaimer: 'FHIR data is synthetic (Synthea). Not real patient PHI.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: true,
      },
    };
  }

  @Tool({
    name: 'get_patient',
    description: 'Get synthetic FHIR R4 patient demographics, address, and medical record number (MRN).',
    inputSchema: z.object({
      patient_id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/).describe('FHIR Patient Resource ID'),
    }),
    examples: {
      request: { patient_id: '12345' },
      response: {
        fhir_id: '12345',
        name: 'Alex Morgan',
        gender: 'male',
        birth_date: '1980-05-15',
        age: 46,
        synthetic_data: true,
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 600, key: (input: any) => `fhir_patient:${input.patient_id}` })
  @RateLimit({ requests: 20, window: '1m' })
  async getPatient(input: any, ctx: ExecutionContext) {
    ctx.logger.info('fhir_get_patient', { patient_id: input.patient_id });
    const result = await this.fhirService.getPatient(input.patient_id);
    return {
      ...result.patient,
      server_used: result.server_used,
      _safety: {
        disclaimer: 'FHIR data is synthetic (Synthea). Not real patient PHI.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: true,
      },
    };
  }

  @Tool({
    name: 'get_conditions',
    description: 'Get active or historical problem list / conditions for a synthetic FHIR patient.',
    inputSchema: z.object({
      patient_id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/).describe('FHIR Patient Resource ID'),
      clinical_status: z.enum(['active', 'resolved', 'any']).default('active').describe('Filter by clinical status'),
    }),
    examples: {
      request: { patient_id: '12345', clinical_status: 'active' },
      response: {
        conditions: [
          { code: '44054006', display: 'Type 2 Diabetes Mellitus', icd10: 'E11.9', status: 'active' },
        ],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 600, key: (input: any) => `fhir_cond:${input.patient_id}:${input.clinical_status ?? 'active'}` })
  @RateLimit({ requests: 20, window: '1m' })
  async getConditions(input: any, ctx: ExecutionContext) {
    ctx.logger.info('fhir_get_conditions', { patient_id: input.patient_id });
    const result = await this.fhirService.getConditions(input.patient_id, input.clinical_status ?? 'active');
    return {
      ...result,
      _safety: {
        disclaimer: 'FHIR data is synthetic (Synthea). Not real patient PHI.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: true,
      },
    };
  }

  @Tool({
    name: 'get_medications',
    description: 'Get active or stopped medication requests for a synthetic FHIR patient.',
    inputSchema: z.object({
      patient_id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/).describe('FHIR Patient Resource ID'),
      status: z.enum(['active', 'stopped', 'any']).default('active').describe('Filter by medication status'),
    }),
    examples: {
      request: { patient_id: '12345', status: 'active' },
      response: {
        medications: [{ name: 'Metformin 500 MG Oral Tablet', rxcui: '860975', status: 'active' }],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 600, key: (input: any) => `fhir_meds:${input.patient_id}:${input.status ?? 'active'}` })
  @RateLimit({ requests: 20, window: '1m' })
  async getMedications(input: any, ctx: ExecutionContext) {
    ctx.logger.info('fhir_get_medications', { patient_id: input.patient_id });
    const result = await this.fhirService.getMedications(input.patient_id, input.status ?? 'active');
    return {
      ...result,
      _safety: {
        disclaimer: 'FHIR data is synthetic (Synthea). Not real patient PHI.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: true,
      },
    };
  }

  @Tool({
    name: 'get_observations',
    description: 'Get vital signs or lab observations history for a synthetic FHIR patient.',
    inputSchema: z.object({
      patient_id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/).describe('FHIR Patient Resource ID'),
      category: z.enum(['vital-signs', 'laboratory', 'any']).default('any').describe('Filter by observation category'),
      code: z.string().optional().describe('Optional LOINC code filter'),
      max_results: z.number().int().min(1).max(50).default(20).describe('Max observation items to return'),
    }),
    examples: {
      request: { patient_id: '12345', category: 'vital-signs', max_results: 5 },
      response: {
        observations: [{ code: '8480-6', display: 'Systolic blood pressure', value: 128, unit: 'mmHg' }],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({
    ttl: 300,
    key: (input: any) =>
      `fhir_obs:${input.patient_id}:${input.category ?? 'any'}:${input.code ?? ''}:${input.max_results ?? 20}`,
  })
  @RateLimit({ requests: 20, window: '1m' })
  async getObservations(input: any, ctx: ExecutionContext) {
    ctx.logger.info('fhir_get_observations', { patient_id: input.patient_id });
    const result = await this.fhirService.getObservations(
      input.patient_id,
      input.category ?? 'any',
      input.code,
      input.max_results ?? 20,
    );
    return {
      ...result,
      _safety: {
        disclaimer: 'FHIR data is synthetic (Synthea). Not real patient PHI.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: true,
      },
    };
  }

  @Tool({
    name: 'get_encounters',
    description: 'Get clinical visit / encounter timeline for a synthetic FHIR patient.',
    inputSchema: z.object({
      patient_id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/).describe('FHIR Patient Resource ID'),
      max_results: z.number().int().min(1).max(25).default(10).describe('Max encounters to return'),
    }),
    examples: {
      request: { patient_id: '12345', max_results: 5 },
      response: {
        encounters: [{ type: 'Encounter for check up', status: 'finished', period_start: '2025-01-10' }],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 600, key: (input: any) => `fhir_enc:${input.patient_id}:${input.max_results ?? 10}` })
  @RateLimit({ requests: 20, window: '1m' })
  async getEncounters(input: any, ctx: ExecutionContext) {
    ctx.logger.info('fhir_get_encounters', { patient_id: input.patient_id });
    const result = await this.fhirService.getEncounters(input.patient_id, input.max_results ?? 10);
    return {
      ...result,
      _safety: {
        disclaimer: 'FHIR data is synthetic (Synthea). Not real patient PHI.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: true,
      },
    };
  }

  @Tool({
    name: 'get_allergies',
    description: 'Get allergy and intolerance records for a synthetic FHIR patient.',
    inputSchema: z.object({
      patient_id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/).describe('FHIR Patient Resource ID'),
    }),
    examples: {
      request: { patient_id: '12345' },
      response: {
        allergies: [{ substance: 'Penicillin', criticality: 'high', status: 'active' }],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 600, key: (input: any) => `fhir_alg:${input.patient_id}` })
  @RateLimit({ requests: 20, window: '1m' })
  async getAllergies(input: any, ctx: ExecutionContext) {
    ctx.logger.info('fhir_get_allergies', { patient_id: input.patient_id });
    const result = await this.fhirService.getAllergies(input.patient_id);
    return {
      ...result,
      _safety: {
        disclaimer: 'FHIR data is synthetic (Synthea). Not real patient PHI.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: true,
      },
    };
  }

  @Tool({
    name: 'get_immunizations',
    description: 'Get immunization and vaccination records for a synthetic FHIR patient.',
    inputSchema: z.object({
      patient_id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/).describe('FHIR Patient Resource ID'),
    }),
    examples: {
      request: { patient_id: '12345' },
      response: {
        immunizations: [{ vaccine_name: 'Influenza, seasonal', date: '2024-10-15', status: 'completed' }],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 600, key: (input: any) => `fhir_imm:${input.patient_id}` })
  @RateLimit({ requests: 20, window: '1m' })
  async getImmunizations(input: any, ctx: ExecutionContext) {
    ctx.logger.info('fhir_get_immunizations', { patient_id: input.patient_id });
    const result = await this.fhirService.getImmunizations(input.patient_id);
    return {
      ...result,
      _safety: {
        disclaimer: 'FHIR data is synthetic (Synthea). Not real patient PHI.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: true,
      },
    };
  }

  @Tool({
    name: 'get_patient_summary',
    description:
      'Get complete aggregated clinical summary bundle for a synthetic FHIR patient ' +
      '(demographics, active conditions, active medications, recent vitals, encounters, allergies, and immunizations). Feeds the flagship patient-summary widget.',
    inputSchema: z.object({
      patient_id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/).describe('FHIR Patient Resource ID'),
    }),
    examples: {
      request: { patient_id: '12345' },
      response: {
        patient: { fhir_id: '12345', name: 'Alex Morgan' },
        active_conditions: [],
        active_medications: [],
        recent_vitals: [],
        recent_encounters: [],
        allergies: [],
        immunizations: [],
        synthetic_data: true,
      },
    },
  })
  @Widget('patient-summary')
  @UseClinicalGateway()
  @Cache({ ttl: 300, key: (input: any) => `fhir_summary:${input.patient_id}` })
  @RateLimit({ requests: 20, window: '1m' })
  async getPatientSummary(input: any, ctx: ExecutionContext) {
    ctx.logger.info('fhir_get_patient_summary', { patient_id: input.patient_id });
    const summary = await this.fhirService.getPatientSummary(input.patient_id);
    return {
      ...summary,
      _safety: {
        disclaimer: 'FHIR data is synthetic (Synthea). Not real patient PHI.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: true,
      },
    };
  }
}
