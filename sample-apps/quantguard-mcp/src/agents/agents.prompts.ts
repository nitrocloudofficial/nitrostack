import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class AgentsPrompts {
  @Prompt({
    name: 'risk_agent_prompt',
    description: 'Prompt for analyzing exposure, drawdowns, and Value at Risk (VaR) compliance',
    arguments: [
      { name: 'exposure', description: 'Total Exposure', required: true },
      { name: 'pnl', description: 'Unrealized PnL', required: true },
      { name: 'var95', description: 'Value at Risk 95%', required: true },
      { name: 'maxDrawdown', description: 'Portfolio Max Drawdown', required: true },
      { name: 'leverage', description: 'Current Leverage', required: true },
      { name: 'suggestedMaxPositionSize', description: 'Suggested position size limit', required: true }
    ]
  })
  async getRiskPrompt(
    args: { exposure: string; pnl: string; var95: string; maxDrawdown: string; leverage: string; suggestedMaxPositionSize: string },
    ctx: ExecutionContext
  ) {
    return [
      {
        role: 'user' as const,
        content: `You are the institutional Risk Agent of a quantitative trading desk.
Analyze the following account risk parameters:
- Total Notional Exposure: $${args.exposure}
- Unrealized PnL: $${args.pnl}
- Value at Risk (VaR 95%): $${args.var95}
- Portfolio Max Drawdown: ${args.maxDrawdown}
- Current Account Leverage: ${args.leverage}
- Suggested Position size limit: $${args.suggestedMaxPositionSize}

Determine whether the current risk levels are SAFE, WARNING, or CRITICAL. Provide a concise, action-oriented report outlining any violations of risk limits.`
      }
    ];
  }

  @Prompt({
    name: 'liquidity_agent_prompt',
    description: 'Prompt for assessing depth, bid-ask spread, and slippage profiles',
    arguments: [
      { name: 'spread', description: 'Bid-ask spread', required: true },
      { name: 'orderImbalance', description: 'Order imbalance ratio', required: true },
      { name: 'liquidityScore', description: 'Overall liquidity score', required: true },
      { name: 'slippage', description: 'Estimated slippage percentage', required: true }
    ]
  })
  async getLiquidityPrompt(
    args: { spread: string; orderImbalance: string; liquidityScore: string; slippage: string },
    ctx: ExecutionContext
  ) {
    return [
      {
        role: 'user' as const,
        content: `You are the Liquidity Agent for the execution desk.
Evaluate these current market liquidity metrics:
- Bid-Ask Spread: ${args.spread} bps
- Order Book Imbalance: ${args.orderImbalance}
- Liquidity Score (0-100): ${args.liquidityScore}
- Expected Slippage (for normal order): ${args.slippage}%

Analyze the order book depth and describe the immediate market impact of trading. Focus on execution slippage and depth exhaustion.`
      }
    ];
  }

  @Prompt({
    name: 'toxicity_agent_prompt',
    description: 'Prompt for evaluating order flow toxicity and VPIN',
    arguments: [
      { name: 'vpin', description: 'VPIN value', required: true },
      { name: 'toxicityStatus', description: 'Toxicity status description', required: true }
    ]
  })
  async getToxicityPrompt(
    args: { vpin: string; toxicityStatus: string },
    ctx: ExecutionContext
  ) {
    return [
      {
        role: 'user' as const,
        content: `You are the Order Flow Toxicity Agent.
Evaluate the current Volume-Synchronized Probability of Toxicity (VPIN):
- VPIN: ${args.vpin}
- Status: ${args.toxicityStatus}

Analyze whether informed traders (toxic flow) dominate the order flow. Explain if entering market orders is structurally safe, or if market makers are likely to pull liquidity.`
      }
    ];
  }

  @Prompt({
    name: 'spoofing_agent_prompt',
    description: 'Prompt for identifying market manipulation and fake liquidity',
    arguments: [
      { name: 'spoofingDetected', description: 'Is spoofing detected', required: true },
      { name: 'direction', description: 'Direction of spoofing', required: true },
      { name: 'spoofingDetails', description: 'Spoofing details context', required: true }
    ]
  })
  async getSpoofingPrompt(
    args: { spoofingDetected: string; direction: string; spoofingDetails: string },
    ctx: ExecutionContext
  ) {
    return [
      {
        role: 'user' as const,
        content: `You are the Spoofing and Order Book Manipulation Detection Agent.
Review the following order book anomalies:
- Spoofing Detected: ${args.spoofingDetected}
- Direction: ${args.direction}
- Details: ${args.spoofingDetails}

Provide an analysis of order book manipulation. Explain if large buy or sell walls are resting artificially to force prices up or down, and describe the risk of executing against this artificial price pressure.`
      }
    ];
  }

  @Prompt({
    name: 'volatility_agent_prompt',
    description: 'Prompt for evaluating short-term price variance and realized volatility',
    arguments: [
      { name: 'volatility', description: 'Current volatility', required: true },
      { name: 'dailyStdDev', description: 'Daily standard deviation benchmark', required: true }
    ]
  })
  async getVolatilityPrompt(
    args: { volatility: string; dailyStdDev: string },
    ctx: ExecutionContext
  ) {
    return [
      {
        role: 'user' as const,
        content: `You are the Volatility Agent.
Review current price volatility metrics:
- Realized Volatility: ${args.volatility}
- Historical daily standard deviation: ${args.dailyStdDev}

Assess whether volatility is abnormal. Explain the implications of this volatility on slippage variance and execution timing.`
      }
    ];
  }

  @Prompt({
    name: 'news_agent_prompt',
    description: 'Prompt for summarizing economic events and news sentiment',
    arguments: [
      { name: 'sentimentScore', description: 'News sentiment score', required: true },
      { name: 'sentimentBreakdown', description: 'Sentiment breakdown info', required: true },
      { name: 'economicCalendar', description: 'Upcoming economic calendar', required: true },
      { name: 'breakingNews', description: 'Recent breaking news', required: true }
    ]
  })
  async getNewsPrompt(
    args: { sentimentScore: string; sentimentBreakdown: string; economicCalendar: string; breakingNews: string },
    ctx: ExecutionContext
  ) {
    return [
      {
        role: 'user' as const,
        content: `You are the Macro News Sentiment Agent.
Summarize the sentiment and potential impact of the following news headlines and calendar events:
- sentimentScore: ${args.sentimentScore} (scale -1 to +1)
- Sentiment Breakdown: ${args.sentimentBreakdown}
- Economic Calendar: ${args.economicCalendar}
- Breaking News Headlines: ${args.breakingNews}

Evaluate whether news flow presents an imminent tail-risk or event-risk.`
      }
    ];
  }

  @Prompt({
    name: 'strategy_agent_prompt',
    description: 'Prompt for synthesizing reports and generating strategy memos',
    arguments: [
      { name: 'volatilityReport', description: 'Report from Volatility Agent', required: true },
      { name: 'liquidityReport', description: 'Report from Liquidity Agent', required: true },
      { name: 'toxicityReport', description: 'Report from Toxicity Agent', required: true },
      { name: 'spoofingReport', description: 'Report from Spoofing Agent', required: true },
      { name: 'riskReport', description: 'Report from Risk Agent', required: true },
      { name: 'newsReport', description: 'Report from News Agent', required: true },
      { name: 'recommendedStrategy', description: 'Deterministic rule recommended strategy', required: true },
      { name: 'confidence', description: 'Rule confidence', required: true }
    ]
  })
  async getStrategyPrompt(
    args: {
      volatilityReport: string;
      liquidityReport: string;
      toxicityReport: string;
      spoofingReport: string;
      riskReport: string;
      newsReport: string;
      recommendedStrategy: string;
      confidence: string;
    },
    ctx: ExecutionContext
  ) {
    return [
      {
        role: 'user' as const,
        content: `You are the Chief Strategy Agent of the trading desk.
Your desk requires an execution recommendation based on the combined reports of the specialist agents:
- Volatility Report: ${args.volatilityReport}
- Liquidity Report: ${args.liquidityReport}
- Toxicity Report: ${args.toxicityReport}
- Spoofing Report: ${args.spoofingReport}
- Risk Report: ${args.riskReport}
- News Sentiment Report: ${args.newsReport}

The deterministic execution engine has selected:
RECOMMENDED STRATEGY: ${args.recommendedStrategy} (Confidence: ${args.confidence})

Write a brief, plain-English executive summary (the "Trading Memo") explaining to the portfolio manager why this strategy is recommended. Do not override the decision. Justify it using the metrics provided.`
      }
    ];
  }
}
