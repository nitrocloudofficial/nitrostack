import {
  Injectable,
  ResourceDecorator as Resource,
  type ExecutionContext,
} from '@nitrostack/core';
import { ApplicationStore } from '../../common/store/application.store.js';
import { PERSONAS, listPersonas } from '../plaid/sandbox-personas.js';

@Injectable({ deps: [ApplicationStore] })
export class OnboardingResources {
  constructor(private readonly store: ApplicationStore) {}

  @Resource({
    uri: 'instantpulse://applications/{applicationId}/report',
    name: 'Application decision report',
    description:
      'The complete decision record for one application: profile, cash-flow metrics, every reason code, ' +
      'blockers, flags, credit recommendation, Stripe status and the full audit trail. This is the ' +
      'artefact to hand an auditor.',
    mimeType: 'application/json',
  })
  async getReport(uri: string, ctx: ExecutionContext) {
    const applicationId = uri.split('/').slice(-2, -1)[0];
    const application = this.store.getOrThrow(applicationId);

    ctx.logger.info('Decision report served', { applicationId });

    const report = {
      ...this.store.toPublic(application),
      auditTrail: this.store.getAudit(applicationId),
      generatedAt: new Date().toISOString(),
    };

    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(report, null, 2) }],
    };
  }

  @Resource({
    uri: 'instantpulse://glossary/metrics',
    name: 'Metric glossary',
    description:
      'Plain-English definition of every metric InstantPulse computes, including how it is derived and ' +
      'why it matters to a credit decision. Read this before interpreting a score.',
    mimeType: 'application/json',
  })
  async getGlossary(uri: string, _ctx: ExecutionContext) {
    const glossary = {
      avgMonthlyInflow: {
        definition: 'Mean money received per complete calendar month in the observed window.',
        derivation: 'Sum of positive-amount transactions per month, averaged over complete months only.',
        whyItMatters: 'The base figure the revenue-based credit ceiling is calculated from.',
      },
      netMonthlyCashFlow: {
        definition: 'Average monthly inflow minus average monthly outflow.',
        derivation: 'avgMonthlyInflow − avgMonthlyOutflow.',
        whyItMatters:
          'Negative net cash flow is a hard blocker. Lending into a shrinking balance accelerates the shortfall.',
      },
      revenueStability: {
        definition: 'How consistent monthly revenue is, on a 0–1 scale where 1 is perfectly steady.',
        derivation: '1 − coefficient of variation of monthly inflows. Scored neutrally under 3 months of data.',
        whyItMatters: 'Steady revenue repays predictably; lumpy revenue may not be there when a payment is due.',
      },
      revenueTrend: {
        definition: 'Month-over-month revenue slope, as a fraction of mean revenue.',
        derivation: 'OLS regression over monthly inflows, normalised by the mean.',
        whyItMatters: 'Direction of travel. A declining business is a different risk from a flat one.',
      },
      revenueTrendConfidence: {
        definition: 'R² of the trend regression, 0–1.',
        derivation: '1 − (residual sum of squares ÷ total sum of squares).',
        whyItMatters:
          'A slope through noisy revenue is meaningless. The engine pulls the trend score toward neutral as ' +
          'this falls, so seasonal businesses are not punished for being seasonal.',
      },
      daysCashOnHand: {
        definition: 'How many days the business could operate on its current balance at its current burn rate.',
        derivation: 'currentBalance ÷ (avgMonthlyOutflow ÷ 30).',
        whyItMatters: 'The most direct measure of near-term survivability.',
      },
      minBalance: {
        definition: 'The lowest balance the account reached during the window.',
        derivation:
          'Reconstructed by walking the ledger backwards from the current balance — Plaid reports a balance, ' +
          'not a balance history.',
        whyItMatters:
          'Far more informative than the balance that happens to be showing today, which may have been topped ' +
          'up the morning the application was filed.',
      },
      negativeBalanceDays: {
        definition: 'Number of days the reconstructed balance was below zero.',
        derivation: 'Count of days in the reconstructed daily balance series where balance < 0.',
        whyItMatters: 'Routine overdraft reliance signals a business operating without a margin.',
      },
      nsfCount: {
        definition: 'Count of non-sufficient-funds and overdraft fee transactions.',
        derivation: 'Keyword match on transaction descriptions across the window.',
        whyItMatters:
          'The strongest single predictor of near-term default in this model. Four or more is a hard blocker.',
      },
      debtServiceRatio: {
        definition: 'Share of monthly revenue already committed to servicing existing debt.',
        derivation: 'Monthly debt-service outflows ÷ avgMonthlyInflow, taking the higher of ledger evidence or reported liability minimums.',
        whyItMatters: 'Determines how much new obligation the business can absorb.',
      },
      accountTenureDays: {
        definition: 'Days of banking history actually observed.',
        derivation: 'Days between the earliest transaction in the window and today.',
        whyItMatters:
          'Bounded by the pull window, so a long-established business may show 180 days. Short tenure means ' +
          'thin evidence, not necessarily bad credit.',
      },
      anomalies: {
        definition: 'Transactions or patterns that a human would stop and ask about.',
        derivation:
          'Round-number wires, statistical outliers, high-risk merchants, revenue spikes, revenue gaps and ' +
          'single-payer concentration. Recurring payments are exempt — a monthly payroll run is explained by definition.',
        whyItMatters:
          'Capped at a 20-point total penalty. Anomalies should colour a decision, never decide one alone.',
      },
    };

    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(glossary, null, 2) }],
    };
  }

  @Resource({
    uri: 'instantpulse://sandbox/personas',
    name: 'Sandbox demo personas',
    description:
      'The reproducible test businesses available to plaid_connect_sandbox_bank. Each is generated from a ' +
      'fixed seed, so the same persona always produces the same ledger and the same band.',
    mimeType: 'application/json',
  })
  async getPersonas(uri: string, _ctx: ExecutionContext) {
    const payload = {
      note:
        'Personas are injected into Plaid Sandbox via the user_custom override when Plaid credentials are ' +
        'configured, and generated locally when they are not. Both paths use the same generator, so the ' +
        'numbers match either way.',
      personas: listPersonas().map((p) => ({
        ...p,
        startingBalance: PERSONAS[p.id].params.startingBalance,
        baseMonthlyRevenue: PERSONAS[p.id].params.baseMonthlyRevenue,
        observedHistoryDays: PERSONAS[p.id].params.accountTenureDays,
      })),
    };

    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(payload, null, 2) }],
    };
  }
}
