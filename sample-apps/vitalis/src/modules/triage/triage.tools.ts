/**
 * TriageTools — Triage module tools.
 * Exposes triage_assess_symptoms, triage_check_red_flags, and triage_get_care_options.
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
import { TriageService, UrgencyTier } from './triage.service.js';
import { UseClinicalGateway } from '../../gateway/clinical-gateway.decorator.js';
import { Cache } from '../../gateway/cache.decorator.js';

@Controller('triage')
@Injectable({ deps: [TriageService] })
export class TriageTools {
  constructor(private readonly triageService: TriageService) {}

  @Tool({
    name: 'assess_symptoms',
    description:
      'Perform a rule-based triage assessment of symptoms to determine urgency tier, ' +
      'detect clinical red flags, suggest candidate conditions, and recommend care timeframe.',
    inputSchema: z.object({
      symptoms: z
        .array(z.string().min(2).max(80))
        .min(1)
        .max(20)
        .describe('List of reported symptoms, e.g. ["chest pain", "shortness of breath"]'),
      age: z
        .number()
        .finite()
        .min(0)
        .max(120)
        .describe('Patient age in years; decimal values such as 0.1 represent infants.'),
      age_months: z
        .number()
        .int()
        .min(0)
        .max(1440)
        .optional()
        .describe('Optional precise age for infants and children, in months.'),
      sex: z.enum(['male', 'female', 'other']).describe('Biological sex / gender'),
      duration_hours: z.number().int().min(0).optional().describe('Symptom duration in hours'),
      severity: z.number().int().min(1).max(10).optional().describe('Patient-reported severity score (1-10)'),
    }),
    examples: {
      request: { symptoms: ['chest pain', 'shortness of breath'], age: 55, sex: 'male', severity: 8 },
      response: {
        urgency_tier: 'emergency',
        red_flags: [{ flag: 'Chest Pain / Pressure', reason: 'Possible acute coronary syndrome.' }],
        possible_conditions: [{ name: 'Acute Coronary Syndrome', likelihood_band: 'common', icd10: 'I24.9' }],
        guidance: 'Immediate clinical evaluation is required. Call 911 immediately.',
        recommended_timeframe: 'Immediate (Call 911 / 112 / 108)',
      },
    },
  })
  @Widget('triage-result')
  @UseClinicalGateway()
  @RateLimit({ requests: 120, window: '1m' })
  async assessSymptoms(input: any, ctx: ExecutionContext) {
    ctx.logger.info('triage_assess_symptoms', {
      symptoms: input.symptoms,
      age: input.age,
      age_months: input.age_months,
    });
    const assessment = this.triageService.assessSymptoms({
      symptoms: input.symptoms,
      age: input.age,
      age_months: input.age_months,
      sex: input.sex,
      duration_hours: input.duration_hours,
      severity: input.severity,
    });

    return {
      ...assessment,
      _safety: {
        disclaimer:
          'Triage assessment is for informational support only and does not constitute a medical diagnosis.',
        urgency_tier: assessment.urgency_tier,
        red_flags_detected: assessment.red_flags.map((rf) => rf.flag),
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'check_red_flags',
    description:
      'Fast emergency-only screen to evaluate symptoms against life-threatening clinical red flags.',
    inputSchema: z.object({
      symptoms: z.array(z.string().min(2).max(80)).min(1).describe('List of symptoms to check'),
    }),
    examples: {
      request: { symptoms: ['slurred speech', 'facial drooping'] },
      response: {
        is_emergency: true,
        matched_red_flags: [{ flag: 'Acute Neurological Deficit', reason: 'High suspicion for acute stroke.' }],
        recommended_action: 'Call emergency services immediately.',
      },
    },
  })
  @UseClinicalGateway()
  @RateLimit({ requests: 120, window: '1m' })
  async checkRedFlags(input: any, ctx: ExecutionContext) {
    ctx.logger.info('triage_check_red_flags', { symptoms: input.symptoms });
    const result = this.triageService.checkRedFlags(input.symptoms);

    return {
      ...result,
      _safety: {
        disclaimer: 'Emergency screening tool. Call emergency services immediately if in doubt.',
        urgency_tier: result.is_emergency ? 'emergency' : 'routine',
        red_flags_detected: result.matched_red_flags.map((f) => f.flag),
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'get_care_options',
    description: 'Map an urgency tier (emergency, urgent, routine, self_care) to appropriate care pathways and preparation.',
    inputSchema: z.object({
      urgency_tier: z
        .enum(['emergency', 'urgent', 'routine', 'self_care'])
        .describe('Urgency level determined from triage'),
      condition: z.string().optional().describe('Optional candidate condition name for context'),
    }),
    examples: {
      request: { urgency_tier: 'urgent', condition: 'Bronchitis' },
      response: {
        care_options: [{ type: 'Urgent Care Center', timeframe: 'Same day (within 4-12 hours)' }],
        escalation_criteria: ['Development of acute chest pain or pressure'],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 86400, key: (input: any) => `care_options:${input.urgency_tier}:${input.condition ?? ''}` })
  @RateLimit({ requests: 120, window: '1m' })
  async getCareOptions(input: any, ctx: ExecutionContext) {
    ctx.logger.info('triage_get_care_options', { urgency_tier: input.urgency_tier });
    const result = this.triageService.getCareOptions(input.urgency_tier as UrgencyTier, input.condition);

    return {
      ...result,
      _safety: {
        disclaimer: 'Care pathway options are general recommendations and do not replace clinical advice.',
        urgency_tier: input.urgency_tier,
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }
}
