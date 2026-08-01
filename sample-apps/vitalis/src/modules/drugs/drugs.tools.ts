/**
 * DrugsTools — Drug Safety module tools.
 * Thin transport layer: validation/caching/rate-limiting here,
 * logic in DrugsService, HTTP in integrations services.
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
import { DrugsService } from './drugs.service.js';
import { UseClinicalGateway } from '../../gateway/clinical-gateway.decorator.js';
import { Cache } from '../../gateway/cache.decorator.js';

@Controller('drugs')
@Injectable({ deps: [DrugsService] })
export class DrugsTools {
  constructor(private readonly drugs: DrugsService) {}

  @Tool({
    name: 'search',
    description:
      'Resolve a free-text drug name to its RxNorm identifier (RxCUI), synonyms, ' +
      'and drug classes. Use fuzzy=true for misspelled or uncertain names.',
    inputSchema: z.object({
      name: z.string().min(2).max(100).describe('Drug name (brand or generic), e.g. "metformin"'),
      fuzzy: z.boolean().default(false).describe('Enable spelling-tolerant approximate matching'),
    }),
    examples: {
      request: { name: 'metformin', fuzzy: false },
      response: {
        matches: [
          {
            rxcui: '6809',
            name: 'Metformin',
            tty: 'IN',
            synonyms: ['Metformin hydrochloride'],
            classes: ['Biguanide'],
          },
        ],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 86400, key: (input: any) => `drug_search:${String(input.name).toLowerCase()}:${input.fuzzy}` })
  @RateLimit({ requests: 60, window: '1m' })
  async search(input: any, ctx: ExecutionContext) {
    ctx.logger.info('drug_search', { name: input.name, fuzzy: input.fuzzy });
    const matches = await this.drugs.searchDrugs(input.name, input.fuzzy ?? false);
    return {
      matches,
      _safety: {
        disclaimer: 'For informational purposes only. Not medical advice.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'get_label_info',
    description:
      'Get official FDA drug label sections (boxed warning, indications, contraindications, ' +
      'warnings, adverse reactions, drug interactions, pregnancy, overdosage) for a drug.',
    inputSchema: z.object({
      drug_name: z.string().min(2).max(100).describe('Drug name (brand or generic)'),
      sections: z
        .array(
          z.enum([
            'boxed_warning',
            'indications_and_usage',
            'contraindications',
            'warnings_and_cautions',
            'adverse_reactions',
            'drug_interactions',
            'pregnancy',
            'overdosage',
          ]),
        )
        .optional()
        .describe('Label sections to return (default: all)'),
    }),
    examples: {
      request: { drug_name: 'warfarin', sections: ['boxed_warning', 'drug_interactions'] },
      response: {
        found: true,
        drug: 'Warfarin Sodium',
        brand_names: ['Coumadin'],
        sections: { boxed_warning: ['WARNING: BLEEDING RISK...'] },
        source: 'openfda',
      },
    },
  })
  @UseClinicalGateway()
  @Cache({
    ttl: 86400,
    key: (input: any) =>
      `drug_label:${String(input.drug_name).toLowerCase()}:${(input.sections ?? []).join('|')}`,
  })
  @RateLimit({ requests: 60, window: '1m' })
  async getLabelInfo(input: any, ctx: ExecutionContext) {
    ctx.logger.info('drug_get_label_info', { drug: input.drug_name });
    const result = await this.drugs.getLabelInfo(input.drug_name, input.sections);
    return {
      ...result,
      _safety: {
        disclaimer: 'For informational purposes only. Not medical advice.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'check_interactions',
    description:
      'Check 2-5 drugs for drug-drug interactions by cross-scanning official FDA label ' +
      'drug_interactions sections. Returns severity-banded findings with evidence excerpts. ' +
      'Absence of a finding is not proof of safety.',
    inputSchema: z.object({
      drugs: z
        .array(z.string().min(2).max(100))
        .min(2)
        .max(5)
        .describe('Drug names to check pairwise (2-5), e.g. ["warfarin", "aspirin"]'),
    }),
    examples: {
      request: { drugs: ['warfarin', 'aspirin'] },
      response: {
        interactions: [
          {
            pair: ['warfarin', 'aspirin'],
            severity_band: 'major',
            evidence_excerpt: 'Aspirin may increase the anticoagulant effect of warfarin...',
            source: 'fda_label',
          },
        ],
        drugs_without_labels: [],
      },
    },
  })
  @Widget('drug-safety-report')
  @UseClinicalGateway()
  @Cache({
    ttl: 21600,
    key: (input: any) =>
      `ddi:${[...(input.drugs as string[])].map((d) => d.toLowerCase()).sort().join('|')}`,
  })
  @RateLimit({ requests: 10, window: '1m' })
  async checkInteractions(input: any, ctx: ExecutionContext) {
    ctx.logger.info('drug_check_interactions', { drugs: input.drugs });
    const result = await this.drugs.checkInteractions(input.drugs);
    return {
      ...result,
      _safety: {
        disclaimer:
          'Interaction findings are derived from FDA label text and may be incomplete. ' +
          'Always confirm medication combinations with a pharmacist or clinician.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'get_adverse_events',
    description:
      'Get the most frequently reported adverse reactions for a drug from the FDA ' +
      'adverse event reporting system (FAERS).',
    inputSchema: z.object({
      drug_name: z.string().min(2).max(100).describe('Drug name (generic preferred)'),
      limit: z.number().int().min(1).max(20).default(10).describe('Max reaction terms to return'),
    }),
    examples: {
      request: { drug_name: 'ibuprofen', limit: 5 },
      response: {
        drug: 'ibuprofen',
        total_reports: 12345,
        top_reactions: [{ term: 'NAUSEA', count: 1234 }],
        reporting_caveat: 'FAERS reports are voluntary and unverified...',
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 43200, key: (input: any) => `drug_faers:${String(input.drug_name).toLowerCase()}:${input.limit}` })
  @RateLimit({ requests: 60, window: '1m' })
  async getAdverseEvents(input: any, ctx: ExecutionContext) {
    ctx.logger.info('drug_get_adverse_events', { drug: input.drug_name });
    const result = await this.drugs.getAdverseEvents(input.drug_name, input.limit ?? 10);
    return {
      ...result,
      _safety: {
        disclaimer:
          'Adverse event counts reflect voluntary reporting frequency, not incidence or causation.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }

  @Tool({
    name: 'get_recalls',
    description: 'Get FDA recall/enforcement actions for a drug (reason, classification, date, status).',
    inputSchema: z.object({
      drug_name: z.string().min(2).max(100).describe('Drug name (generic preferred)'),
    }),
    examples: {
      request: { drug_name: 'metformin' },
      response: {
        drug: 'metformin',
        recalls: [
          {
            recall_number: 'D-1234-2020',
            reason: 'Nitrosamine impurity above acceptable limit',
            classification: 'II',
            recall_initiation_date: '20200520',
            status: 'Terminated',
          },
        ],
      },
    },
  })
  @UseClinicalGateway()
  @Cache({ ttl: 43200, key: (input: any) => `drug_recalls:${String(input.drug_name).toLowerCase()}` })
  @RateLimit({ requests: 60, window: '1m' })
  async getRecalls(input: any, ctx: ExecutionContext) {
    ctx.logger.info('drug_get_recalls', { drug: input.drug_name });
    const result = await this.drugs.getRecalls(input.drug_name);
    return {
      ...result,
      _safety: {
        disclaimer: 'For informational purposes only. Not medical advice.',
        urgency_tier: 'not_applicable',
        red_flags_detected: [],
        synthetic_data: false,
      },
    };
  }
}
