import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import {
  DATA_DISCLAIMER,
  getBiasDictionary,
  getHerdSentiment,
  getHistoricalPatterns,
  getMarketData,
  getPortfolio,
  getWaitOutcomes,
  readDecisionLog
} from './guardian.store.js';
import { summarizeTradeHistory, valuePortfolio } from './guardian.logic.js';

const json = (uri: string, payload: unknown) => ({
  contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(payload, null, 2) }]
});

export class GuardianResources {
  @Resource({
    uri: 'guardian://portfolio',
    name: 'User Portfolio',
    description: 'Raw holdings, cost basis, stated goal and time horizon (mock data).',
    mimeType: 'application/json'
  })
  async portfolio(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading portfolio resource');
    return json(uri, { ...getPortfolio(), _disclaimer: DATA_DISCLAIMER });
  }

  @Resource({
    uri: 'guardian://portfolio/valued',
    name: 'Valued Portfolio Snapshot',
    description: 'Holdings priced at current quotes, with weights, sector breakdown and unrealised P/L.',
    mimeType: 'application/json'
  })
  async valued(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading valued portfolio resource');
    return json(uri, { ...valuePortfolio(), _disclaimer: DATA_DISCLAIMER });
  }

  @Resource({
    uri: 'guardian://market-events',
    name: 'Market Event Feed',
    description: 'Quotes, index and sector moves, and the recent event feed (mock data, includes deliberate noise).',
    mimeType: 'application/json'
  })
  async marketEvents(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading market events resource');
    return json(uri, getMarketData());
  }

  @Resource({
    uri: 'guardian://historical-patterns',
    name: 'Historical Decision Outcomes',
    description: 'Base rates for what followed panic-sell, FOMO-buy and herd-follow decisions, with counterweight cases.',
    mimeType: 'application/json'
  })
  async historicalPatterns(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading historical patterns resource');
    return json(uri, getHistoricalPatterns());
  }

  @Resource({
    uri: 'guardian://bias-signals',
    name: 'Bias Signal Dictionary',
    description: 'The phrase dictionary, weights, gates and thresholds behind detect_behavioral_signal.',
    mimeType: 'application/json'
  })
  async biasSignals(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading bias signal dictionary');
    return json(uri, getBiasDictionary());
  }

  @Resource({
    uri: 'guardian://trade-history',
    name: 'Personal Decision History',
    description: "This user's prior bias signals, what they chose, and how those calls turned out.",
    mimeType: 'application/json'
  })
  async tradeHistory(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading trade history resource');
    return json(uri, { ...summarizeTradeHistory(), _disclaimer: DATA_DISCLAIMER });
  }

  @Resource({
    uri: 'guardian://wait-outcomes',
    name: 'Wait-Window Base Rates',
    description:
      'What happened to a mock cohort that waited 24h / 7d / 30d instead of acting, by event type. Includes the cases where waiting cost money.',
    mimeType: 'application/json'
  })
  async waitOutcomes(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading wait outcomes resource');
    return json(uri, getWaitOutcomes());
  }

  @Resource({
    uri: 'guardian://herd-sentiment',
    name: 'Crowd Activity',
    description: 'Mock retail order flow, mention volume and fear/greed reading. Descriptive only, never a signal.',
    mimeType: 'application/json'
  })
  async herdSentiment(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading herd sentiment resource');
    return json(uri, getHerdSentiment());
  }

  @Resource({
    uri: 'guardian://decision-log',
    name: 'Decision Audit Trail',
    description: 'Every intervention raised this session, the context shown, and what the user chose.',
    mimeType: 'application/json'
  })
  async decisionLog(uri: string, ctx: ExecutionContext) {
    const entries = readDecisionLog();
    ctx.logger.info('Reading decision log', { entries: entries.length });

    const interventions = entries.filter((e) => e.detected_pattern !== null);
    return json(uri, {
      entries,
      summary: {
        total: entries.length,
        interventions_raised: interventions.length,
        proceeded_anyway: interventions.filter((e) => e.user_decision === 'proceeded').length,
        paused_or_reconsidered: interventions.filter((e) => e.user_decision !== 'proceeded').length
      },
      purpose:
        'Two jobs: an audit trail showing exactly what was placed in front of the user before they decided, and a research record of which nudges actually change behaviour.'
    });
  }

  @Resource({
    uri: 'guardian://operating-rules',
    name: 'Guardian Operating Rules',
    description: 'The compliance boundary the agent operates inside. Read this before composing any user-facing response.',
    mimeType: 'application/json'
  })
  async operatingRules(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading operating rules');
    return json(uri, {
      principle: 'The agent informs and reflects. It never recommends.',
      always: [
        'Surface which holdings an event actually touches, and by how much.',
        'Separate broad-market and sector moves from company-specific news, explicitly.',
        'Name the bias pattern detected and the phrases that triggered it, without moralising.',
        'Give base rates from history, labelled as what happened to others, never as a forecast.',
        'Ask exactly one reflective question, then stop talking.',
        "Log the decision, including when the user proceeds anyway."
      ],
      never: [
        'Say buy, sell, hold, or "you should".',
        'Predict a price, a recovery, or a return.',
        'Block, delay, or execute a trade — there is no brokerage connection and none is simulated.',
        'Raise an intervention on an informational question or a pre-planned trade.',
        'Stack multiple questions or repeat the intervention once the user has decided.'
      ],
      thresholds: getBiasDictionary().thresholds,
      banned_phrases: getBiasDictionary().banned_advice_phrases.phrases,
      false_positive_policy:
        'A missed nudge costs one decision. A false nudge costs the relationship — the user stops reading them, and the next real one lands on deaf ears. When the signal is borderline, say less.',
      disclaimer: DATA_DISCLAIMER
    });
  }
}
