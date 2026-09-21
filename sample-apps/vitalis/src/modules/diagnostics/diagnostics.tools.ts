/**
 * DiagnosticsTools — Diagnostics Support module tools.
 * Exposes dx_lookup_condition, dx_lookup_icd11, dx_interpret_lab_value, dx_explain_lab_test, and dx_symptom_to_codes.
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
import { DiagnosticsService } from './diagnostics.service.js';
import { WhoIcdService } from '../../integrations/who-icd.service.js';
import { UseClinicalGateway } from '../../gateway/clinical-gateway.decorator.js';
import { Cache } from '../../gateway/cache.decorator.js';

@Controller('diagnostics')
@Injectable({ deps: [DiagnosticsService, WhoIcdService] })
export class DiagnosticsTools {
  constructor(
    private readonly dxService: DiagnosticsService,
    private readonly whoIcdService: WhoIcdService,
  ) {}

  @Tool({
    name: 'lookup_condition',
    description:
      'Search condition name to get corresponding ICD-10-CM code(s) and clinical description.',
    inputSchema: z.object({
      query: z.string().min(2).max(200).describe('Condition name or search term, e.g. "type 2 diabetes"'),
      max_results: z.number().int().min(1).max(25).default(10).describe('Max results to return'),
    }),
    examples: {
      request: { query: 'hypertension', max_results: 5 },
      response: {
        results: [{ icd10_code: 'I10', name: 'Essential (primary) hypertension', synonyms: [] }],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 86400, key: (input: any) => `dx_lookup:${String(input.query).toLowerCase()}:${input.max_results}` })
  @RateLimit({ requests: 120, window: '1m' })
  async lookupCondition(input: any, ctx: ExecutionContext) {
    ctx.logger.info('dx_lookup_condition', { query: input.query });
    const result = await this.dxService.lookupCondition(input.query, input.max_results ?? 10);
    return {
      ...result,
      _safety: {
        disclaimer: 'ICD-10-CM code lookup is for documentation support, not clinical diagnosis.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'lookup_icd11',
    description:
      'Search condition name to get corresponding WHO ICD-11 MMS entity codes, chapter classification, and ICD-10 crosswalk.',
    inputSchema: z.object({
      query: z.string().min(2).max(200).describe('Condition name or search term, e.g. "type 2 diabetes"'),
      max_results: z.number().int().min(1).max(10).default(5).describe('Max entities to return'),
    }),
    examples: {
      request: { query: 'type 2 diabetes' },
      response: {
        results: [{ icd11_code: '5A11', title: 'Type 2 diabetes mellitus', chapter: '05 Endocrine...' }],
        source: 'who_icd11_reference_table',
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 86400, key: (input: any) => `dx_icd11:${String(input.query).toLowerCase()}:${input.max_results ?? 5}` })
  @RateLimit({ requests: 60, window: '1m' })
  async lookupIcd11(input: any, ctx: ExecutionContext) {
    ctx.logger.info('dx_lookup_icd11', { query: input.query });
    const result = await this.whoIcdService.searchIcd11(input.query, input.max_results ?? 5);
    return {
      ...result,
      _safety: {
        disclaimer: 'WHO ICD-11 classification lookup is for clinical documentation support, not automated diagnosis.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'interpret_lab_value',
    description:
      'Interpret a quantitative laboratory test value against established reference ranges (low, normal, high, critical).',
    inputSchema: z.object({
      analyte: z
        .string()
        .describe(
          'Analyte code/name, e.g. "glucose", "potassium", "wbc", "hba1c", "creatinine", "sodium", "alt", "tsh"',
        ),
      value: z.number().describe('Quantitative measured lab value'),
      unit: z.string().describe('Unit of measurement, e.g. "mg/dL", "mEq/L", "%"'),
      age: z.number().int().optional().describe('Patient age'),
      sex: z.enum(['male', 'female', 'other']).optional().describe('Patient sex'),
    }),
    examples: {
      request: { analyte: 'hba1c', value: 8.2, unit: '%' },
      response: {
        analyte: 'Glycated Hemoglobin (HbA1c)',
        value: 8.2,
        unit: '%',
        flag: 'high',
        reference_range: { low: 4.0, high: 5.6, unit: '%' },
        possible_causes: ['Diabetes mellitus (>=6.5%)', 'Uncontrolled hyperglycemia'],
      },
    },
  })
  @Widget('lab-result-card')
  @UseClinicalGateway()
  @RateLimit({ requests: 120, window: '1m' })
  async interpretLabValue(input: any, ctx: ExecutionContext) {
    ctx.logger.info('dx_interpret_lab_value', { analyte: input.analyte, value: input.value });
    const result = this.dxService.interpretLabValue(input.analyte, input.value, input.unit);

    const isCritical = result.flag === 'critical_high' || result.flag === 'critical_low';

    return {
      ...result,
      _safety: {
        disclaimer:
          'Lab value interpretation is rule-based and must be correlated with clinical symptoms by a healthcare provider.',
        urgency_tier: isCritical ? 'urgent' : 'not_applicable',
        red_flags_detected: isCritical ? [`Critical Lab Value: ${result.analyte} (${input.value} ${input.unit})`] : [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'explain_lab_test',
    description:
      'Provide a patient-friendly, grade-6 reading level explanation of what a lab test measures, why it is ordered, and test preparation.',
    inputSchema: z.object({
      test_name: z.string().min(2).describe('Name or abbreviation of lab test (e.g. "cbc", "cmp", "lipid_panel", "hba1c", "tsh")'),
    }),
    examples: {
      request: { test_name: 'hba1c' },
      response: {
        test_name: 'Hemoglobin A1c (HbA1c)',
        what_it_measures: 'Average blood sugar levels over the past 2 to 3 months.',
        why_ordered: 'Used to diagnose and monitor diabetes.',
        preparation: ['No fasting required.'],
        reading_level: 'grade6',
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 86400, key: (input: any) => `dx_explain:${String(input.test_name).toLowerCase()}` })
  @RateLimit({ requests: 120, window: '1m' })
  async explainLabTest(input: any, ctx: ExecutionContext) {
    ctx.logger.info('dx_explain_lab_test', { test: input.test_name });
    const result = this.dxService.explainLabTest(input.test_name);
    return {
      ...result,
      _safety: {
        disclaimer: 'Educational lab information. Consult your healthcare team regarding your specific results.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'symptom_to_codes',
    description: 'Map reported symptom text to candidate ICD-10-CM codes for documentation and coding support.',
    inputSchema: z.object({
      symptom: z.string().min(2).max(200).describe('Symptom description, e.g. "cough" or "joint pain"'),
    }),
    examples: {
      request: { symptom: 'cough' },
      response: {
        symptom: 'cough',
        candidate_codes: [{ icd10_code: 'R05', name: 'Cough' }],
        usage_note: 'Documentation assistance only, NOT automated diagnosis.',
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 86400, key: (input: any) => `dx_symptom_codes:${String(input.symptom).toLowerCase()}` })
  @RateLimit({ requests: 120, window: '1m' })
  async symptomToCodes(input: any, ctx: ExecutionContext) {
    ctx.logger.info('dx_symptom_to_codes', { symptom: input.symptom });
    const result = await this.dxService.symptomToCodes(input.symptom);
    return {
      ...result,
      _safety: {
        disclaimer: 'ICD-10-CM coding recommendations are for clinical documentation support only.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }
}
