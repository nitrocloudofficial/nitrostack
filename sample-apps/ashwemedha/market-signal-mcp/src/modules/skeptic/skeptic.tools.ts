import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { readLatestFinding } from '../scout/findings-board.resource.js';
import { readLatestSignal } from '../analyst/signal-log.resource.js';
import { writeVerdict, VerdictLogEntry } from './verdict-log.resource.js';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

// Load static datasets
function loadCredibilityData() {
  const p = path.join(DATA_DIR, 'source-credibility.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch {
    return {
      tiers: {
        high: ['reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com'],
        medium: ['cnbc.com', 'marketwatch.com', 'seekingalpha.com', 'biztoc.com', 'thestreet.com'],
        low: ['reddit.com', 'twitter.com', 'stocktwits.com'],
        press_release_mills: ['prnewswire.com', 'businesswire.com', 'globenewswire.com'],
      },
      scores: { 'reuters.com': 95, 'bloomberg.com': 95, 'biztoc.com': 70, 'thestreet.com': 75 },
    };
  }
}

function loadMarketCalendar() {
  const p = path.join(DATA_DIR, 'market-calendar.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch {
    return { events: {} };
  }
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under',
  'and', 'but', 'or', 'nor', 'not', 'only', 'own', 'same', 'than', 'too',
  'very', 'just', 'about', 'its', 'their', 'says', 'said', 'report',
  'reports', 'new', 'up', 'down', 'this', 'that', 'these', 'those', 'it',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1.0;
  if (a.size === 0 || b.size === 0) return 0.0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

export class SkepticTools {
  // @Widget('check-source-credibility')
  @Tool({
    name: 'check_source_credibility',
    description: 'Evaluates the credibility of a news outlet domain.',
    inputSchema: z.object({
      source_domain: z.string().describe("Source domain (e.g. 'reuters.com' or 'biztoc.com')"),
    }),
  })
  async checkSourceCredibilityTool(input: { source_domain: string }, ctx: ExecutionContext) {
    const domain = input.source_domain.toLowerCase().replace(/^www\./, '');
    ctx.logger.info('Skeptic: check_source_credibility started', { domain });

    const cred = loadCredibilityData();
    const { tiers, scores } = cred;

    if (tiers.press_release_mills?.includes(domain)) {
      return {
        credibility_tier: 'low',
        is_press_release_mill: true,
        credibility_score: scores?.[domain] ?? 15,
        check_result: 'flagged',
        reason: `${domain} is a company press release distribution service (self-reported marketing).`,
      };
    }

    if (tiers.high?.includes(domain)) {
      return {
        credibility_tier: 'high',
        is_press_release_mill: false,
        credibility_score: scores?.[domain] ?? 90,
        check_result: 'pass',
        reason: `${domain} is a tier-1 institutional financial outlet.`,
      };
    }

    if (tiers.medium?.includes(domain)) {
      return {
        credibility_tier: 'medium',
        is_press_release_mill: false,
        credibility_score: scores?.[domain] ?? 70,
        check_result: 'pass',
        reason: `${domain} is a recognized financial news source.`,
      };
    }

    return {
      credibility_tier: 'unknown',
      is_press_release_mill: false,
      credibility_score: scores?.[domain] ?? 50,
      check_result: 'pass',
      reason: `${domain} is a standard web news source.`,
    };
  }

  // @Widget('check-recycled-content')
  @Tool({
    name: 'check_recycled_content',
    description: 'Checks if a headline is recycled from prior coverage using Jaccard word overlap.',
    inputSchema: z.object({
      headline_text: z.string().describe('Headline to check'),
      ticker: z.string().describe('Ticker symbol'),
      historical_headlines: z.array(z.string()).optional().describe('Historical headlines to compare against'),
    }),
  })
  async checkRecycledContentTool(
    input: { headline_text: string; ticker: string; historical_headlines?: string[] },
    ctx: ExecutionContext
  ) {
    const { headline_text, ticker, historical_headlines = [] } = input;
    ctx.logger.info('Skeptic: check_recycled_content started', { ticker, headline_text });

    const currentTokens = tokenize(headline_text);
    let maxSim = 0;
    let mostSimilar: string | null = null;

    for (const hist of historical_headlines) {
      const sim = jaccard(currentTokens, tokenize(hist));
      if (sim > maxSim) {
        maxSim = sim;
        mostSimilar = hist;
      }
    }

    const isRecycled = maxSim >= 0.65;
    return {
      is_recycled: isRecycled,
      similarity_score: Math.round(maxSim * 100) / 100,
      most_similar_headline: mostSimilar,
      check_result: isRecycled ? 'flagged' : 'pass',
      reason: isRecycled
        ? `Headline shares ${Math.round(maxSim * 100)}% word overlap with a prior ${ticker} headline.`
        : `Headline shows ${Math.round(maxSim * 100)}% similarity to prior headlines — appears fresh.`,
    };
  }

  // @Widget('check-volume-context')
  @Tool({
    name: 'check_volume_context',
    description: 'Checks whether elevated trading volume coincides with scheduled earnings/economic calendar events.',
    inputSchema: z.object({
      ticker: z.string().describe('Ticker symbol'),
      date: z.string().describe('ISO date string (YYYY-MM-DD)'),
    }),
  })
  async checkVolumeContextTool(input: { ticker: string; date: string }, ctx: ExecutionContext) {
    const ticker = input.ticker.toUpperCase();
    const date = input.date.split('T')[0];
    ctx.logger.info('Skeptic: check_volume_context started', { ticker, date });

    const cal = loadMarketCalendar();
    const events: any[] = [...(cal.events?.[ticker] ?? []), ...(cal.events?.['MARKET'] ?? [])];

    for (const ev of events) {
      if (ev.date === date) {
        return {
          volume_context: 'explained_by_calendar_event',
          event_type: ev.type,
          event_date: ev.date,
          event_description: ev.description,
          reason: `Volume activity on ${date} coincides with a scheduled ${ev.type}: "${ev.description}".`,
        };
      }
    }

    return {
      volume_context: 'organic',
      event_type: null,
      event_date: null,
      event_description: null,
      reason: `No scheduled calendar events on ${date} for ${ticker}. Volume appears organic.`,
    };
  }

  @Widget('generate-verdict')
  @Tool({
    name: 'generate_verdict',
    description: 'Runs adversarial checks on Scout findings & Analyst signal, producing the final confirmed/weakened/rejected verdict. ' +
      'IMPORTANT: Render this result using the /generate-verdict widget. ' +
      'Do not combine multiple agent outputs into a single composite widget — ' +
      'render each agent\'s result individually using its own widget.',
    inputSchema: z.object({
      ticker: z.string().describe('Ticker symbol (e.g. TSLA, NVDA, AAPL, BTC)'),
    }),
  })
  async generateVerdictTool(input: { ticker: string }, ctx: ExecutionContext) {
    const ticker = input.ticker.toUpperCase();
    ctx.logger.info('Skeptic: generate_verdict started', { ticker });

    const findings = readLatestFinding(ticker);
    const signal = readLatestSignal(ticker);

    const challenges: string[] = [];
    let credibility_check: 'pass' | 'flagged' = 'pass';
    let recycled_content_check: 'pass' | 'flagged' = 'pass';
    let volume_context_check: 'organic' | 'explained_by_calendar_event' = 'organic';

    const headlines = findings?.headlines ?? [];
    if (headlines.length > 0) {
      let flaggedCred = 0;
      for (const h of headlines) {
        const credRes = await this.checkSourceCredibilityTool({ source_domain: h.source }, ctx);
        if (credRes.check_result === 'flagged') flaggedCred++;
      }
      if (flaggedCred > headlines.length / 2) {
        credibility_check = 'flagged';
        challenges.push(`${flaggedCred} of ${headlines.length} sources have low/unknown credibility ratings.`);
      }

      const texts = headlines.map(h => h.text);
      if (texts.length >= 2) {
        const recRes = await this.checkRecycledContentTool(
          { headline_text: texts[0], ticker, historical_headlines: texts.slice(1) },
          ctx
        );
        if (recRes.check_result === 'flagged') {
          recycled_content_check = 'flagged';
          challenges.push(`Headline content matches previous coverage (${recRes.similarity_score * 100}% overlap).`);
        }
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const volRes = await this.checkVolumeContextTool({ ticker, date: today }, ctx);
    volume_context_check = volRes.volume_context as any;
    if (volume_context_check === 'explained_by_calendar_event') {
      challenges.push(`Volume explained by scheduled ${volRes.event_type} (${volRes.event_description}).`);
    }

    if (findings?.narrative_entropy === 'high') {
      challenges.push('Elevated narrative entropy (retail hype vocabulary spike).');
    }

    const flagCount = (credibility_check === 'flagged' ? 1 : 0) +
                      (recycled_content_check === 'flagged' ? 1 : 0) +
                      (volume_context_check === 'explained_by_calendar_event' ? 1 : 0);

    const final_verdict: 'confirmed_signal' | 'weakened_signal' | 'rejected_signal' =
      flagCount === 0 ? 'confirmed_signal' : flagCount === 1 ? 'weakened_signal' : 'rejected_signal';

    const score = signal?.signal_score ?? 60;
    const direction = signal?.signal_direction ?? 'bullish';

    let verdict_reasoning: string;
    if (final_verdict === 'confirmed_signal') {
      verdict_reasoning = `Confirmed signal for ${ticker} (${direction}, score ${score}/100). All Skeptic checks cleared.`;
    } else if (final_verdict === 'weakened_signal') {
      verdict_reasoning = `Weakened signal for ${ticker} (${direction}, score ${score}/100). 1 adversarial challenge: ${challenges[0]}`;
    } else {
      verdict_reasoning = `Rejected signal for ${ticker}. ${flagCount} adversarial checks failed: ${challenges.join(' | ')}`;
    }

    const entry: VerdictLogEntry = {
      ticker,
      timestamp: new Date().toISOString(),
      challenges_raised: challenges,
      credibility_check,
      recycled_content_check,
      volume_context_check,
      final_verdict,
      verdict_reasoning,
    };

    writeVerdict(entry);
    ctx.logger.info('Skeptic: wrote to verdict_log', { ticker, final_verdict });

    return entry;
  }
}
