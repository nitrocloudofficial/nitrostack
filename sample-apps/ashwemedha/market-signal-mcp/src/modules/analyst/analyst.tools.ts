import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { readLatestFinding, FindingsBoardEntry } from '../scout/findings-board.resource.js';
import { writeSignal, SignalLogEntry } from './signal-log.resource.js';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceVolumeData {
  ticker: string;
  currency: string;
  current_price: number;
  previous_close: number;
  change_pct: number;
  volume_today: number;
  volume_30d_avg: number;
  volume_ratio: number;
  price_bars: PriceBar[];
  fetched_at: string;
  source: 'yahoo' | 'coingecko' | 'alpha_vantage' | 'seed_fallback' | 'cache';
}

const priceCache = new Map<string, PriceVolumeData>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedPriceVolume(ticker: string): PriceVolumeData | null {
  const cached = priceCache.get(ticker.toUpperCase());
  if (!cached) return null;
  const age = Date.now() - new Date(cached.fetched_at).getTime();
  if (age > CACHE_TTL_MS) {
    priceCache.delete(ticker.toUpperCase());
    return null;
  }
  return cached;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

async function fetchFromYahoo(ticker: string): Promise<PriceVolumeData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1mo&interval=1d`;
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketSignalMCP/1.0)' },
    timeout: 8000,
  });

  const result = res.data?.chart?.result?.[0];
  if (!result) throw new Error(`No Yahoo chart data for ${ticker}`);

  const meta = result.meta;
  const quotes = result.indicators.quote[0];
  const timestamps = result.indicators.timestamp ?? [];

  const bars: PriceBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quotes.open[i];
    const h = quotes.high[i];
    const l = quotes.low[i];
    const c = quotes.close[i];
    const v = quotes.volume[i];
    if (o == null || h == null || l == null || c == null || v == null) continue;
    bars.push({
      date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
      open: o, high: h, low: l, close: c, volume: v,
    });
  }

  const volume30dAvg = bars.length > 0
    ? bars.reduce((sum, b) => sum + b.volume, 0) / bars.length
    : meta.regularMarketVolume ?? 1000000;

  const volumeToday = meta.regularMarketVolume ?? (bars.length > 0 ? bars[bars.length - 1].volume : 1000000);
  const volumeRatio = volume30dAvg > 0 ? volumeToday / volume30dAvg : 1.0;
  const prevClose = meta.previousClose ?? meta.regularMarketPrice;
  const currentPrice = meta.regularMarketPrice;
  const changePct = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

  return {
    ticker,
    currency: 'USD',
    current_price: round(currentPrice),
    previous_close: round(prevClose),
    change_pct: round(changePct),
    volume_today: volumeToday,
    volume_30d_avg: Math.round(volume30dAvg),
    volume_ratio: round(volumeRatio),
    price_bars: bars,
    fetched_at: new Date().toISOString(),
    source: 'yahoo',
  };
}

async function fetchFromAlphaVantage(ticker: string, apiKey: string): Promise<PriceVolumeData> {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
  const res = await axios.get(url, { timeout: 8000 });
  const quote = res.data?.['Global Quote'];
  if (!quote || !quote['05. price']) throw new Error(`Alpha Vantage quote missing for ${ticker}`);

  const price = parseFloat(quote['05. price']);
  const prevClose = parseFloat(quote['08. previous close']);
  const changePctStr = quote['10. change percent'] ?? '0%';
  const changePct = parseFloat(changePctStr.replace('%', ''));
  const volume = parseInt(quote['06. volume'] ?? '1000000', 10);

  // Fetch 30 days of daily volume to compute a real average
  let volume30dAvg = Math.round(volume * 0.85);
  let volumeRatio = volume30dAvg > 0 ? Math.round((volume / volume30dAvg) * 100) / 100 : 1.0;
  try {
    const tsRes = await axios.get(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`,
      { timeout: 10000 },
    );
    const tsData = tsRes.data?.['Time Series (Daily)'];
    if (tsData) {
      const vols = Object.values(tsData)
        .slice(0, 30)
        .map((bar: any) => parseInt(bar['5. volume'] ?? '0', 10))
        .filter((v: number) => v > 0);
      if (vols.length >= 5) {
        volume30dAvg = Math.round(vols.reduce((s: number, v: number) => s + v, 0) / vols.length);
        volumeRatio = volume30dAvg > 0 ? Math.round((volume / volume30dAvg) * 100) / 100 : 1.0;
      }
    }
  } catch {
    // TIME_SERIES_DAILY may rate-limit; keep the GLOBAL_QUOTE-derived estimate
  }

  return {
    ticker,
    currency: 'USD',
    current_price: price,
    previous_close: prevClose,
    change_pct: changePct,
    volume_today: volume,
    volume_30d_avg: volume30dAvg,
    volume_ratio: volumeRatio,
    price_bars: [{
      date: quote['07. latest trading day'] ?? new Date().toISOString().split('T')[0],
      open: parseFloat(quote['02. open'] ?? String(price)),
      high: parseFloat(quote['03. high'] ?? String(price)),
      low: parseFloat(quote['04. low'] ?? String(price)),
      close: price,
      volume,
    }],
    fetched_at: new Date().toISOString(),
    source: 'alpha_vantage',
  };
}

// ─── CoinGecko — supports any crypto, not just BTC ────────────────────────────
// Known IDs avoid an extra search API call for common coins.
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple',
  DOGE: 'dogecoin', ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot',
  LINK: 'chainlink', MATIC: 'matic-network', LTC: 'litecoin', BNB: 'binancecoin',
};

async function resolveCoinGeckoId(ticker: string): Promise<string> {
  if (COINGECKO_IDS[ticker]) return COINGECKO_IDS[ticker];
  // Unknown crypto: search CoinGecko to find the right ID
  const r = await axios.get('https://api.coingecko.com/api/v3/search', {
    params: { query: ticker }, timeout: 8_000,
  });
  const coin = (r.data.coins ?? [])[0];
  if (!coin?.id) throw new Error(`CoinGecko: no result found for ticker ${ticker}`);
  return coin.id;
}

async function fetchFromCoinGecko(ticker: string): Promise<PriceVolumeData> {
  const coinId = await resolveCoinGeckoId(ticker);
  const res = await axios.get(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`,
    { timeout: 8000 }
  );
  const coinData = res.data?.[coinId];
  if (!coinData) throw new Error(`No CoinGecko data for ${coinId}`);

  const price = coinData.usd;
  const vol = coinData.usd_24h_vol ?? 1000000000;
  const changePct = coinData.usd_24h_change ?? 0;
  const prevClose = price / (1 + changePct / 100);

  // Fetch 30 days of daily volume to compute a real average
  let volume30dAvg = Math.round(vol * 0.9);
  let volumeRatio = volume30dAvg > 0 ? Math.round((vol / volume30dAvg) * 100) / 100 : 1.0;
  try {
    const chartRes = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
      { params: { vs_currency: 'usd', days: '30', interval: 'daily' }, timeout: 10000 },
    );
    const volumes: number[] = (chartRes.data?.total_volumes ?? [])
      .map((pair: [number, number]) => pair[1])
      .filter((v: number) => v > 0);
    if (volumes.length >= 5) {
      volume30dAvg = Math.round(volumes.reduce((s: number, v: number) => s + v, 0) / volumes.length);
      volumeRatio = volume30dAvg > 0 ? Math.round((vol / volume30dAvg) * 100) / 100 : 1.0;
    }
  } catch {
    // market_chart may rate-limit on free tier; keep the simple/price-derived estimate
  }

  return {
    ticker,
    currency: 'USD',
    current_price: round(price),
    previous_close: round(prevClose),
    change_pct: round(changePct),
    volume_today: Math.round(vol),
    volume_30d_avg: volume30dAvg,
    volume_ratio: volumeRatio,
    price_bars: [{
      date: new Date().toISOString().split('T')[0],
      open: round(prevClose),
      high: round(price * 1.01),
      low: round(price * 0.99),
      close: round(price),
      volume: Math.round(vol),
    }],
    fetched_at: new Date().toISOString(),
    source: 'coingecko',
  };
}

function loadSeedPriceData(ticker: string): PriceVolumeData {
  const seedPrices: Record<string, Partial<PriceVolumeData>> = {
    TSLA: { current_price: 248.50, previous_close: 242.10, change_pct: 2.64, volume_today: 95000000, volume_30d_avg: 68000000, volume_ratio: 1.40 },
    NVDA: { current_price: 128.20, previous_close: 125.00, change_pct: 2.56, volume_today: 55000000, volume_30d_avg: 50000000, volume_ratio: 1.10 },
    AAPL: { current_price: 224.30, previous_close: 223.80, change_pct: 0.22, volume_today: 42000000, volume_30d_avg: 48000000, volume_ratio: 0.88 },
    BTC:  { current_price: 64200, previous_close: 61800, change_pct: 3.88, volume_today: 32000000000, volume_30d_avg: 24000000000, volume_ratio: 1.33 },
  };
  const d = seedPrices[ticker] ?? { current_price: 100, previous_close: 100, change_pct: 0, volume_today: 1000000, volume_30d_avg: 880000, volume_ratio: 1.14 };
  return {
    ticker,
    currency: 'USD',
    current_price: d.current_price!,
    previous_close: d.previous_close!,
    change_pct: d.change_pct!,
    volume_today: d.volume_today!,
    volume_30d_avg: d.volume_30d_avg!,
    volume_ratio: d.volume_ratio!,
    price_bars: [{
      date: new Date().toISOString().split('T')[0],
      open: d.previous_close!,
      high: d.current_price! * 1.01,
      low: d.previous_close! * 0.99,
      close: d.current_price!,
      volume: d.volume_today!,
    }],
    fetched_at: new Date().toISOString(),
    source: 'seed_fallback',
  };
}

export class AnalystTools {
  // @Widget('fetch-price-volume')
  @Tool({
    name: 'fetch_price_volume',
    description:
      'Analyst Agent: Fetches real-time price & volume data for any ticker. ' +
      'Uses Yahoo Finance as primary source (1-month bars), Alpha Vantage as secondary, ' +
      'CoinGecko for any crypto (BTC, ETH, SOL, or any coin by dynamic search), ' +
      'and seed data as final fallback. Results are cached for 5 minutes.',
    inputSchema: z.object({
      ticker: z.string().describe('Any ticker symbol — stocks (AAPL, TSLA, MRF), crypto (BTC, ETH, SOL), or any symbol'),
    }),
  })
  async fetchPriceVolumeTool(input: { ticker: string }, ctx: ExecutionContext) {
    const ticker = input.ticker.toUpperCase();
    ctx.logger.info('Analyst: fetch_price_volume started', { ticker });

    const cached = getCachedPriceVolume(ticker);
    if (cached) return { data: cached, source: 'cache' };

    // Detect crypto: known set first, then treat as crypto if it has a CoinGecko match
    const isCrypto = ticker in COINGECKO_IDS;
    const avKey = process.env.ALPHA_VANTAGE_KEY;

    try {
      let data: PriceVolumeData;
      if (isCrypto) {
        data = await fetchFromCoinGecko(ticker);
      } else {
        // Fallback chain: Alpha Vantage → Yahoo Finance
        let fetched = false;
        if (avKey && avKey !== 'your_alpha_vantage_key_here') {
          try {
            data = await fetchFromAlphaVantage(ticker, avKey);
            fetched = true;
          } catch (avErr: any) {
            ctx.logger.warn(`Analyst: Alpha Vantage failed for ${ticker}, trying Yahoo Finance...`, { error: avErr.message });
          }
        }
        if (!fetched) {
          data = await fetchFromYahoo(ticker);
        }
      }
      priceCache.set(ticker, data!);
      return { data: data!, source: data!.source };
    } catch (err: any) {
      ctx.logger.warn(`Analyst: all live price sources failed for ${ticker}, using seed fallback`, { error: err.message });
      const fallback = loadSeedPriceData(ticker);
      priceCache.set(ticker, fallback);
      return { data: fallback, source: 'seed_fallback' };
    }
  }

  //@Widget('cross-check-price-action')
  @Tool({
    name: 'cross_check_price_action',
    description: 'Cross-checks findings_board news timestamp against price movement to classify price reaction.',
    inputSchema: z.object({
      ticker: z.string().describe('Ticker symbol'),
    }),
  })
  async crossCheckPriceActionTool(input: { ticker: string }, ctx: ExecutionContext) {
    const ticker = input.ticker.toUpperCase();
    ctx.logger.info('Analyst: cross_check_price_action started', { ticker });

    const findings = readLatestFinding(ticker);
    const priceRes = await this.fetchPriceVolumeTool({ ticker }, ctx);
    const priceData = priceRes.data;

    const absChange = Math.abs(priceData.change_pct);
    const volRatio = priceData.volume_ratio;

    let price_reaction: 'already_moved' | 'moving_now' | 'not_yet_reacted';
    let reasoning: string;

    if (absChange >= 2.0) {
      price_reaction = 'already_moved';
      reasoning = `${ticker} has moved ${absChange.toFixed(1)}% (${priceData.change_pct > 0 ? 'up' : 'down'}). Signal is already priced in by the market.`;
    } else if (absChange >= 0.5 && volRatio >= 1.2) {
      price_reaction = 'moving_now';
      reasoning = `${ticker} is moving now (${absChange.toFixed(1)}% price change with ${volRatio.toFixed(1)}x avg volume). Active market repricing.`;
    } else {
      price_reaction = 'not_yet_reacted';
      reasoning = `${ticker} has not yet reacted (${absChange.toFixed(1)}% move, ${volRatio.toFixed(1)}x volume). Early signal opportunity window.`;
    }

    return {
      ticker,
      price_reaction,
      price_change_since_news_pct: priceData.change_pct,
      volume_ratio: volRatio,
      reasoning,
      findings_timestamp: findings?.timestamp,
    };
  }

  @Widget('assess-signal-strength')
  @Tool({
    name: 'assess_signal_strength',
    description: 'Combines findings_board sentiment, mention velocity, and price reaction into a final 0-100 signal score. ' +
      'IMPORTANT: Render this result using the /assess-signal-strength widget. ' +
      'Do not combine multiple agent outputs into a single composite widget — ' +
      'render each agent\'s result individually using its own widget.',
    inputSchema: z.object({
      ticker: z.string().describe('Ticker symbol'),
    }),
  })
  async assessSignalStrengthTool(input: { ticker: string }, ctx: ExecutionContext) {
    const ticker = input.ticker.toUpperCase();
    ctx.logger.info('Analyst: assess_signal_strength started', { ticker });

    const findings = readLatestFinding(ticker);
    const priceCheck = await this.crossCheckPriceActionTool({ ticker }, ctx);

    const headlines = findings?.headlines ?? [];
    const sentimentScores = headlines.map(h => h.sentiment_score);
    const avgSentiment = sentimentScores.length > 0
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
      : 0;

    let baseScore = 40;
    if (avgSentiment >= 0.5) baseScore = 70;
    else if (avgSentiment >= 0.2) baseScore = 55;
    else if (avgSentiment <= -0.5) baseScore = 70;
    else if (avgSentiment <= -0.2) baseScore = 55;

    const velocityAdj = findings?.mention_velocity === 'spiking' ? 15 : findings?.mention_velocity === 'declining' ? -10 : 0;
    const priceAdj = priceCheck.price_reaction === 'not_yet_reacted' ? 15 : priceCheck.price_reaction === 'already_moved' ? -15 : 0;

    const rawScore = baseScore + velocityAdj + priceAdj;
    const finalScore = Math.max(0, Math.min(100, rawScore));

    const signal_direction: 'bullish' | 'bearish' | 'neutral' =
      avgSentiment > 0.05 ? 'bullish' : avgSentiment < -0.05 ? 'bearish' : 'neutral';

    const reasoning = `${ticker} scored ${finalScore}/100 (${signal_direction}). Avg sentiment ${avgSentiment.toFixed(2)} across ${headlines.length} headlines. Base: ${baseScore}, Velocity: ${velocityAdj > 0 ? '+' : ''}${velocityAdj}, Price reaction: ${priceAdj > 0 ? '+' : ''}${priceAdj}. ${priceCheck.reasoning}`;

    const entry: SignalLogEntry = {
      ticker,
      timestamp: new Date().toISOString(),
      price_reaction: priceCheck.price_reaction,
      signal_score: finalScore,
      signal_direction,
      reasoning,
    };

    writeSignal(entry);
    ctx.logger.info('Analyst: wrote to signal_log', { ticker, finalScore, signal_direction });

    return {
      signal: entry,
      audit_trail: {
        avg_sentiment: round(avgSentiment),
        base_score: baseScore,
        velocity_adjustment: velocityAdj,
        price_adjustment: priceAdj,
        final_score: finalScore,
      },
    };
  }

  //@Widget('historical-pattern-lookup')
  @Tool({
    name: 'historical_pattern_lookup',
    description: 'Looks up historical pattern performance for a ticker.',
    inputSchema: z.object({
      ticker: z.string().describe('Ticker symbol'),
      pattern_type: z.string().optional().describe('Pattern type e.g. earnings_beat, sentiment_spike'),
    }),
  })
  async historicalPatternLookupTool(input: { ticker: string; pattern_type?: string }, ctx: ExecutionContext) {
    const ticker = input.ticker.toUpperCase();
    const patternType = input.pattern_type ?? 'sentiment_spike';
    ctx.logger.info('Analyst: historical_pattern_lookup started', { ticker, patternType });

    const histPath = path.join(DATA_DIR, 'historical-signals.json');
    let matches: any[] = [];
    if (fs.existsSync(histPath)) {
      try {
        const histData = JSON.parse(fs.readFileSync(histPath, 'utf-8'));
        const tickerData = histData[ticker] ?? [];
        matches = tickerData.filter((p: any) =>
          !patternType || (p.pattern_type ?? '').toLowerCase().includes(patternType.toLowerCase())
        );
      } catch {
        matches = [];
      }
    }

    const avgScore = matches.length > 0
      ? matches.reduce((sum, m) => sum + (m.signal_score ?? 50), 0) / matches.length
      : null;  // null = no data, not a score

    return {
      ticker,
      pattern_type: patternType,
      matches_found: matches.length,
      matches,
      avg_signal_score: avgScore !== null ? round(avgScore) : null,
      summary: matches.length > 0
        ? `Found ${matches.length} historical pattern matches for ${ticker} (${patternType}). Avg signal score: ${round(avgScore!)}/100.`
        : `No historical data found for ${ticker} (${patternType}). Cannot assess precedent — treat this signal as novel.`,
    };
  }
}
