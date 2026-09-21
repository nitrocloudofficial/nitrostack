import {
  ControllerDecorator as Controller,
  Injectable,
  RateLimit,
  ToolDecorator as Tool,
  UseFilters,
  Widget,
  z,
  type ExecutionContext,
} from '@nitrostack/core';
import { InstantPulseExceptionFilter } from '../../common/filters/instantpulse.filter.js';
import { ValidateInput } from '../../common/pipes/validate-input.js';
import { ApplicationStore } from '../../common/store/application.store.js';
import type { PersonaId } from '../../common/types/instantpulse.types.js';
import { DecisionOrchestrator } from './decision.orchestrator.js';

const RunPipelineInput = z.object({
  businessName: z.string().min(1).describe('Registered or trading name of the business'),
  industry: z.string().min(1).default('general').describe('Industry or sector'),
  requestedAmount: z.number().nonnegative().optional().describe('Credit amount requested, in USD'),
  entityType: z.string().optional().describe('Legal entity type, e.g. LLC'),
  contactEmail: z.string().email().optional().describe('Applicant contact email'),
  country: z.string().default('US').describe('ISO country code'),
  persona: z
    .enum(['healthy', 'volatile', 'distressed', 'default'])
    .default('healthy')
    .describe(
      'Which Plaid Sandbox business to connect. healthy → GREEN, volatile → YELLOW, distressed → RED, ' +
        "default → Plaid's stock sandbox user. Seeded, so results are reproducible.",
    ),
  windowDays: z
    .number()
    .int()
    .min(30)
    .max(365)
    .default(180)
    .describe('Days of transaction history to analyse'),
  autoStartStripe: z
    .boolean()
    .default(true)
    .describe('Automatically begin Stripe onboarding when the decision is GREEN'),
});

const ComparePersonasInput = z.object({
  requestedAmount: z.number().nonnegative().default(50_000).describe('Credit amount to request for each'),
  windowDays: z.number().int().min(30).max(365).default(180),
  includeDefault: z
    .boolean()
    .default(false)
    .describe("Include Plaid's stock sandbox user, whose history is usually too thin to score"),
});

@Controller('decision')
@Injectable({ deps: [DecisionOrchestrator, ApplicationStore] })
export class DecisionTools {
  constructor(
    private readonly orchestrator: DecisionOrchestrator,
    private readonly store: ApplicationStore,
  ) {}

  @Tool({
    name: 'run_full_pipeline',
    description:
      'The end-to-end onboarding decision in a single call: opens the application, connects a Plaid Sandbox ' +
      'bank account, pulls and normalises the transaction history, computes cash-flow metrics, produces a ' +
      'scored GREEN/YELLOW/RED decision with reason codes and a recommended credit limit, and — for GREEN ' +
      'applications only — starts Stripe payment onboarding. This is the three-to-five-day manual review, ' +
      'compressed into one round trip.',
    inputSchema: RunPipelineInput,
    examples: {
      request: {
        businessName: 'Northwind Supply Co.',
        industry: 'wholesale distribution',
        requestedAmount: 50000,
        persona: 'healthy',
      },
      response: {
        band: 'GREEN',
        score: 92,
        recommendedLimit: 61500,
        elapsedMs: 340,
        stripeOnboardingUrl: 'https://connect.stripe.com/setup/s/…',
      },
    },
  })
  @Widget('onboarding-decision')
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(RunPipelineInput)
  @RateLimit({ requests: 20, window: '1m' })
  async runFullPipeline(
    input: {
      businessName: string;
      industry: string;
      requestedAmount?: number;
      entityType?: string;
      contactEmail?: string;
      country: string;
      persona: PersonaId;
      windowDays: number;
      autoStartStripe: boolean;
    },
    ctx: ExecutionContext,
  ) {
    const result = await this.orchestrator.run(
      {
        businessName: input.businessName,
        industry: input.industry,
        entityType: input.entityType,
        requestedAmount: input.requestedAmount,
        contactEmail: input.contactEmail,
        country: input.country || 'US',
      },
      input.persona,
      input.windowDays,
      input.autoStartStripe,
      ctx.logger,
    );

    const { application } = result;
    const decision = application.decision!;
    const metrics = application.metrics!;

    return {
      applicationId: application.applicationId,
      businessName: application.profile.businessName,
      industry: application.profile.industry,
      status: application.status,

      // Headline: what a manager reads first.
      band: decision.band,
      score: decision.score,
      recommendedLimit: decision.credit.recommendedLimit,
      summary: decision.summary,
      nextAction: decision.nextAction,

      decision,
      metrics,

      stripe: result.stripe,
      stripeSkippedReason: result.stripeSkippedReason,

      provenance: {
        dataSource: application.snapshot?.source,
        institutionName: application.snapshot?.institutionName,
        persona: input.persona,
        transactionsAnalyzed: application.snapshot?.transactions.length ?? 0,
        windowDays: input.windowDays,
        policyVersion: decision.policyVersion,
      },

      timing: {
        elapsedMs: result.elapsedMs,
        stagesCompleted: result.stagesCompleted,
        comparison: 'Traditional manual review for this decision takes 3–5 business days.',
      },
    };
  }

  @Tool({
    name: 'compare_personas',
    description:
      'Run the full pipeline across every sandbox persona and return the decisions side by side. The fastest ' +
      'way to show that the same policy produces GREEN, YELLOW and RED outcomes on genuinely different ' +
      'financial profiles, and to sanity-check the model after changing the policy.',
    inputSchema: ComparePersonasInput,
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(ComparePersonasInput)
  @RateLimit({ requests: 5, window: '1m' })
  async comparePersonas(
    input: { requestedAmount: number; windowDays: number; includeDefault: boolean },
    ctx: ExecutionContext,
  ) {
    const personas: PersonaId[] = input.includeDefault
      ? ['healthy', 'volatile', 'distressed', 'default']
      : ['healthy', 'volatile', 'distressed'];

    const results = [];

    for (const persona of personas) {
      const result = await this.orchestrator.run(
        {
          businessName: `Comparison — ${persona}`,
          industry: 'comparison run',
          requestedAmount: input.requestedAmount,
          country: 'US',
        },
        persona,
        input.windowDays,
        false, // never start real onboarding from a comparison sweep
        ctx.logger,
      );

      const d = result.application.decision!;
      const m = result.application.metrics!;

      results.push({
        persona,
        applicationId: result.application.applicationId,
        band: d.band,
        score: d.score,
        recommendedLimit: d.credit.recommendedLimit,
        bindingConstraint: d.credit.bindingConstraint,
        avgMonthlyRevenue: m.avgMonthlyInflow,
        netMonthlyCashFlow: m.netMonthlyCashFlow,
        daysCashOnHand: Math.round(m.daysCashOnHand),
        revenueStability: m.revenueStability,
        nsfCount: m.nsfCount,
        anomalyCount: m.anomalies.length,
        hardBlockers: d.hardBlockers.map((b) => b.code),
        softFlags: d.softFlags.map((f) => f.code),
        elapsedMs: result.elapsedMs,
      });
    }

    return {
      policyVersion: results[0] ? this.store.getOrThrow(results[0].applicationId).decision?.policyVersion : undefined,
      dataSource: this.store.getOrThrow(results[0].applicationId).snapshot?.source,
      totalElapsedMs: results.reduce((sum, r) => sum + r.elapsedMs, 0),
      results,
      note:
        'Every decision above came from the same published policy at instantpulse://policy/risk-model. The ' +
        'bands differ because the underlying financial behaviour differs, not because the rules changed.',
    };
  }
}
