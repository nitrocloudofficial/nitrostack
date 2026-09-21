/**
 * CareTools — Care Coordination module tools.
 * Exposes care_generate_handoff, care_reconcile_medications, care_draft_referral, care_find_guidelines, care_appointment_prep.
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
import { CareService } from './care.service.js';
import { UseClinicalGateway } from '../../gateway/clinical-gateway.decorator.js';
import { Cache } from '../../gateway/cache.decorator.js';

@Controller('care')
@Injectable({ deps: [CareService] })
export class CareTools {
  constructor(private readonly careService: CareService) {}

  @Tool({
    name: 'generate_handoff',
    description:
      'Generate a standardized SBAR (Situation, Background, Assessment, Recommendation) or narrative clinical handoff summary from synthetic FHIR patient data.',
    inputSchema: z.object({
      patient_id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/).describe('FHIR Patient Resource ID'),
      format: z.enum(['sbar', 'narrative']).default('sbar').describe('Output format'),
    }),
    examples: {
      request: { patient_id: '12345', format: 'sbar' },
      response: {
        patient_id: '12345',
        sbar: { situation: '...', background: '...', assessment: '...', recommendation: '...' },
        synthetic_data: true,
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 300, key: (input: any) => `care_handoff:${input.patient_id}:${input.format ?? 'sbar'}` })
  @RateLimit({ requests: 20, window: '1m' })
  async generateHandoff(input: any, ctx: ExecutionContext) {
    ctx.logger.info('care_generate_handoff', { patient_id: input.patient_id });
    const result = await this.careService.generateHandoff(input.patient_id, input.format ?? 'sbar');
    return {
      ...result,
      _safety: {
        disclaimer: 'Clinical handoff draft generated from synthetic FHIR data. Review prior to clinical handover.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: true,
      },
    };
  }

  @Tool({
    name: 'reconcile_medications',
    description:
      'Reconcile two medication lists (e.g. EHR active list vs patient-reported home list) to identify added, removed, continued, or duplicate-risk drugs. Feeds the med-reconciliation widget.',
    inputSchema: z.object({
      list_a: z.array(z.string().min(1).max(100)).min(1).max(50).describe('First medication list (e.g. EHR active meds)'),
      list_b: z.array(z.string().min(1).max(100)).min(1).max(50).describe('Second medication list (e.g. patient reported meds)'),
      label_a: z.string().default('List A').describe('Label for first list'),
      label_b: z.string().default('List B').describe('Label for second list'),
    }),
    examples: {
      request: {
        list_a: ['Metformin 500mg', 'Warfarin 5mg'],
        list_b: ['Metformin 500mg', 'Warfarin 5mg', 'Ibuprofen 400mg'],
        label_a: 'EHR List',
        label_b: 'Patient Reported',
      },
      response: {
        continued: ['Metformin 500mg', 'Warfarin 5mg'],
        added: ['Ibuprofen 400mg'],
        removed: [],
        possible_duplicates: [
          { a: 'Warfarin 5mg', b: 'Ibuprofen 400mg', reason: 'Bleeding risk interaction' },
        ],
      },
    },
  })
  @Widget('med-reconciliation')
  @UseClinicalGateway()
  @RateLimit({ requests: 60, window: '1m' })
  async reconcileMedications(input: any, ctx: ExecutionContext) {
    ctx.logger.info('care_reconcile_medications', { count_a: input.list_a.length, count_b: input.list_b.length });
    const result = await this.careService.reconcileMedications(
      input.list_a,
      input.list_b,
      input.label_a ?? 'List A',
      input.label_b ?? 'List B',
    );

    return {
      ...result,
      _safety: {
        disclaimer: 'Medication reconciliation diff is for clinical decision support. Confirm all drug lists with patient.',
        urgency_tier: result.possible_duplicates.length > 0 ? 'routine' : 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'draft_referral',
    description:
      'Draft a specialist referral letter and consultation request context using FHIR patient data.',
    inputSchema: z.object({
      patient_id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/).describe('FHIR Patient Resource ID'),
      specialty: z.string().min(2).max(100).describe('Specialty name, e.g. "Endocrinology"'),
      reason: z.string().min(5).max(500).describe('Clinical reason for specialist referral'),
      urgency: z.enum(['routine', 'urgent']).default('routine').describe('Referral urgency'),
    }),
    examples: {
      request: { patient_id: '12345', specialty: 'Endocrinology', reason: 'Uncontrolled HbA1c 8.2% despite metformin' },
      response: {
        referral: { to_specialty: 'Endocrinology', reason: 'Uncontrolled HbA1c...', draft_text: '...' },
        requires_clinician_review: true,
      },
    },
  })
  @UseClinicalGateway()
  @RateLimit({ requests: 60, window: '1m' })
  async draftReferral(input: any, ctx: ExecutionContext) {
    ctx.logger.info('care_draft_referral', { patient_id: input.patient_id, specialty: input.specialty });
    const result = await this.careService.draftReferral(
      input.patient_id,
      input.specialty,
      input.reason,
      input.urgency ?? 'routine',
    );

    return {
      ...result,
      _safety: {
        disclaimer: 'Referral note draft requires mandatory review and signature by a licensed clinician.',
        urgency_tier: input.urgency === 'urgent' ? 'urgent' : 'routine',
        red_flags_detected: input.urgency === 'urgent' ? ['Marked Urgent Specialist Referral'] : [],
        synthetic_data: true,
      },
    };
  }

  @Tool({
    name: 'find_guidelines',
    description: 'Search PubMed for peer-reviewed clinical practice guidelines for a specified condition.',
    inputSchema: z.object({
      condition: z.string().min(2).max(200).describe('Condition or disease name, e.g. "hypertension"'),
      max_results: z.number().int().min(1).max(10).default(5).describe('Max guideline papers to return'),
    }),
    examples: {
      request: { condition: 'type 2 diabetes', max_results: 5 },
      response: {
        guidelines: [{ title: '2025 ADA Standards of Care in Diabetes', pmid: '12345678' }],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 43200, key: (input: any) => `guidelines:${String(input.condition).toLowerCase()}:${input.max_results ?? 5}` })
  @RateLimit({ requests: 10, window: '1m' })
  async findGuidelines(input: any, ctx: ExecutionContext) {
    ctx.logger.info('care_find_guidelines', { condition: input.condition });
    const result = await this.careService.findGuidelines(input.condition, input.max_results ?? 5);
    return {
      ...result,
      _safety: {
        disclaimer: 'Clinical practice guidelines are provided for informational reference.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'appointment_prep',
    description:
      'Generate a patient visit-preparation checklist and itemized bring-list based on visit type and condition.',
    inputSchema: z.object({
      visit_type: z
        .enum(['new_diagnosis', 'follow_up', 'annual_physical', 'specialist_referral'])
        .describe('Type of clinical appointment'),
      condition: z.string().optional().describe('Optional target condition name'),
    }),
    examples: {
      request: { visit_type: 'new_diagnosis', condition: 'Hypertension' },
      response: {
        visit_type: 'new_diagnosis',
        checklist: [{ item: 'Bring list of all current medications', category: 'documents' }],
        bring_list: ['Medication list', 'Symptom log', 'Insurance card'],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 86400, key: (input: any) => `appt_prep:${input.visit_type}:${input.condition ?? ''}` })
  @RateLimit({ requests: 120, window: '1m' })
  async appointmentPrep(input: any, ctx: ExecutionContext) {
    ctx.logger.info('care_appointment_prep', { visit_type: input.visit_type });
    const result = this.careService.getAppointmentPrep(input.visit_type, input.condition);
    return {
      ...result,
      _safety: {
        disclaimer: 'Appointment preparation checklists are educational guidance for patients.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }
}
