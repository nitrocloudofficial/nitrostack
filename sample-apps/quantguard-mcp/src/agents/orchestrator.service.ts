import { Injectable } from '@nitrostack/core';
import { MarketTools } from '../market/market.tools.js';
import { RiskTools } from '../risk/risk.tools.js';
import { StrategyTools } from '../strategy/strategy.tools.js';
import { MarketResource } from '../market/market.resource.js';
import { OrderBookResource } from '../orderbook/orderbook.resource.js';
import { NewsResource } from '../news/news.resource.js';
import { RiskResource } from '../risk/risk.resource.js';
import { LlmService } from './llm.service.js';
import { DbService } from '../db/db.service.js';

@Injectable({
  deps: [
    MarketTools,
    RiskTools,
    StrategyTools,
    MarketResource,
    OrderBookResource,
    NewsResource,
    RiskResource,
    LlmService,
    DbService
  ]
})
export class OrchestratorService {
  constructor(
    private marketTools: MarketTools,
    private riskTools: RiskTools,
    private strategyTools: StrategyTools,
    private marketResource: MarketResource,
    private orderBookResource: OrderBookResource,
    private newsResource: NewsResource,
    private riskResource: RiskResource,
    private llmService: LlmService,
    private dbService: DbService
  ) {}

  /**
   * Run the full multi-agent trading validation and save memo to database
   */
  async generateTradingMemo(ticker: string, account: string) {
    const ctxDummy: any = { logger: console };
    
    // Step 1: Fetch Shared Resources
    const marketData = await this.marketResource.getMarketData({ ticker }, ctxDummy);
    const orderbookData = await this.orderBookResource.getOrderBook({ ticker }, ctxDummy);
    const riskData = await this.riskResource.getRiskMetrics({ account }, ctxDummy);
    const newsData = await this.newsResource.getNews({ ticker }, ctxDummy);

    // Step 2: Run Core Analytics Tools in Parallel
    const [marketScan, toxicity, spoofing, liquidity, riskAnalysis] = await Promise.all([
      this.marketTools.scanMarket({ ticker }, ctxDummy),
      this.marketTools.analyzeToxicity({ ticker }, ctxDummy),
      this.marketTools.detectSpoofing({ ticker }, ctxDummy),
      this.marketTools.analyzeLiquidity({ ticker, orderSize: 10000 }, ctxDummy),
      this.riskTools.analyzeRisk({ account, positionTicker: ticker, proposedSize: 10000 }, ctxDummy)
    ]);

    // Step 3: Run Deterministic optimize_execution rule logic
    const optimized = await this.strategyTools.optimizeExecution({
      vpin: toxicity.vpin,
      spread: marketData.spread,
      volatility: marketScan.volatility,
      spoofingDetected: spoofing.spoofingDetected
    }, ctxDummy);

    // Step 4: Ask LLM (StrategyAgent) to phrase human-readable explanation
    const prompt = `You are the Chief Strategy Agent of the trading desk.
Your desk requires an execution recommendation based on the combined reports of the specialist agents:
- Volatility: Realized volatility is ${marketScan.volatility.toFixed(6)}.
- Liquidity: Liquidity Score is ${liquidity.liquidityScore}. Expected slippage is ${liquidity.estimatedSlippagePercent}%.
- Toxicity: VPIN is ${toxicity.vpin} (${toxicity.toxicityStatus} toxicity status).
- Spoofing: Spoofing active = ${spoofing.spoofingDetected}. Direction = ${spoofing.direction}. Details = ${spoofing.spoofingDetails}
- Risk: VaR95 = $${riskAnalysis.var95}. Expected Shortfall = $${riskAnalysis.expectedShortfall}. Risk approved = ${riskAnalysis.riskApproved}.
- News Sentiment: News sentiment score is ${newsData.sentimentScore}.

The deterministic execution engine has selected:
RECOMMENDED STRATEGY: ${optimized.recommendedStrategy} (Confidence: ${optimized.confidence})

Write a brief, plain-English executive summary (the "Trading Memo") explaining to the portfolio manager why this strategy is recommended. Do not override the decision. Justify it using the metrics provided.`;

    const reasoning = await this.llmService.generateText(prompt);

    const memo = {
      id: `${ticker}_${Date.now()}`,
      ticker,
      timestamp: Date.now(),
      liquidity: {
        score: liquidity.liquidityScore,
        slippagePercent: liquidity.estimatedSlippagePercent,
        depthSummary: liquidity.depthSummary
      },
      toxicity: {
        vpin: toxicity.vpin,
        status: toxicity.toxicityStatus
      },
      spoofing: {
        detected: spoofing.spoofingDetected,
        direction: spoofing.direction,
        details: spoofing.spoofingDetails
      },
      volatility: {
        volatility: marketScan.volatility
      },
      risk: {
        var95: riskAnalysis.var95,
        expectedShortfall: riskAnalysis.expectedShortfall,
        portfolioDrawdown: riskAnalysis.portfolioDrawdown,
        riskApproved: riskAnalysis.riskApproved,
        comments: riskAnalysis.comments
      },
      news: {
        sentimentScore: newsData.sentimentScore,
        breakdown: newsData.sentimentBreakdown
      },
      recommendation: optimized.recommendedStrategy,
      confidence: optimized.confidence,
      reasoning
    };

    // Step 5: Persist signal/memo to database
    this.persistMemo(memo);

    return memo;
  }

  /**
   * Persist Trading Memo to SQLite DB
   */
  private persistMemo(memo: any) {
    try {
      this.dbService.run(
        `INSERT INTO trading_memos (
          id, ticker, timestamp, liquidity_metrics, toxicity_metrics, 
          spoofing_metrics, volatility_metrics, risk_metrics, 
          news_sentiment, recommendation, confidence, reasoning
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          memo.id,
          memo.ticker,
          new Date(memo.timestamp).toISOString(),
          JSON.stringify(memo.liquidity),
          JSON.stringify(memo.toxicity),
          JSON.stringify(memo.spoofing),
          JSON.stringify(memo.volatility),
          JSON.stringify(memo.risk),
          JSON.stringify(memo.news),
          memo.recommendation,
          memo.confidence,
          memo.reasoning
        ]
      );

      // Also persist to signals table for compatibility with existing ERD
      this.dbService.run(
        `INSERT OR REPLACE INTO signals (id, symbol, signal_type, confidence, generated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          memo.id,
          memo.ticker,
          memo.recommendation,
          memo.confidence
        ]
      );
    } catch (e) {
      console.error('Failed to persist memo to database', e);
    }
  }

  /**
   * Fetch latest memo from DB
   */
  async getLatestMemo(ticker: string): Promise<any> {
    const row = this.dbService.get(
      `SELECT * FROM trading_memos WHERE ticker = ? ORDER BY timestamp DESC LIMIT 1`,
      [ticker]
    );
    if (!row) return null;
    return {
      id: row.id,
      ticker: row.ticker,
      timestamp: new Date(row.timestamp).getTime(),
      liquidity: JSON.parse(row.liquidity_metrics),
      toxicity: JSON.parse(row.toxicity_metrics),
      spoofing: JSON.parse(row.spoofing_metrics),
      volatility: JSON.parse(row.volatility_metrics),
      risk: JSON.parse(row.risk_metrics),
      news: JSON.parse(row.news_sentiment),
      recommendation: row.recommendation,
      confidence: row.confidence,
      reasoning: row.reasoning
    };
  }
}
