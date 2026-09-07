# QuantGuard MCP — Low-Level Design (LLD)

This document specifies the technical design, module architecture, database schemas, and decision logic for **QuantGuard MCP**, a multi-agent trading safety and execution risk platform.

---

## 1. System Architecture

```mermaid
graph TD
    Terminal[Trading Terminal / UI] -->|Exposes Widgets| Client[MCP Client / NitroStudio]
    Client -->|JSON-RPC Protocol| Server[QuantGuard MCP Server]

    subgraph Server Modules
        Server -->|Orchestrates| AgentsModule[Agents Module]
        
        AgentsModule --> StrategyAgent[Strategy Agent]
        AgentsModule --> RiskAgent[Risk Agent]
        AgentsModule --> LiquidityAgent[Liquidity Agent]
        AgentsModule --> ToxicityAgent[Toxicity Agent]
        AgentsModule --> SpoofingAgent[Spoofing Agent]
        AgentsModule --> VolatilityAgent[Volatility Agent]
        AgentsModule --> NewsAgent[News Agent]
        
        StrategyAgent -->|Uses| StrategyModule[Strategy Module]
        
        SharedRes[Shared Resources]
        SharedRes --> MarketRes[Market Resource]
        SharedRes --> OBRes[OrderBook Resource]
        SharedRes --> RiskRes[Risk Resource]
        SharedRes --> NewsRes[News Resource]
    end

    subgraph Data Layer
        SharedRes --> SQLite[(SQLite DB)]
        MarketRes -->|HTTP / WS| Binance[Binance WebSocket / Yahoo Finance]
    end
```

---

## 2. Module & Dependency Injection (DI) Diagram

Every block below represents a NitroStack module (`@Module`), showing the injected services and modules.

```mermaid
graph TD
    classDef module fill:#1f2937,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef service fill:#10b981,stroke:#047857,stroke-width:1px,color:#fff;

    subgraph DbModule
        DB_Mod[DbModule]:::module
        DB_Svc[DbService]:::service
        DB_Mod -.-> DB_Svc
    end

    subgraph MarketModule
        Mkt_Mod[MarketModule]:::module
        YF_Prov[YahooFinanceProvider]:::service
        Mkt_Svc[MarketDataService]:::service
        Mkt_Res[MarketResource]:::service
        Mkt_Mod -.-> YF_Prov
        Mkt_Mod -.-> Mkt_Svc
        Mkt_Mod -.-> Mkt_Res
    end

    subgraph OrderbookModule
        OB_Mod[OrderbookModule]:::module
        OB_Res[OrderBookResource]:::service
        OB_Mod -.-> OB_Res
    end

    subgraph RiskModule
        Risk_Mod[RiskModule]:::module
        Risk_Res[RiskResource]:::service
        Risk_Svc[RiskService]:::service
        Risk_Mod -.-> Risk_Res
        Risk_Mod -.-> Risk_Svc
    end

    subgraph NewsModule
        News_Mod[NewsModule]:::module
        News_Res[NewsResource]:::service
        News_Svc[NewsService]:::service
        News_Mod -.-> News_Res
        News_Mod -.-> News_Svc
    end

    subgraph StrategyModule
        Strat_Mod[StrategyModule]:::module
        Strat_Svc[StrategyService]:::service
        Strat_Mod -.-> Strat_Svc
    end

    subgraph AgentsModule
        Agt_Mod[AgentsModule]:::module
        Orch_Svc[OrchestratorService]:::service
        Agt_Mod -.-> Orch_Svc
    end

    %% Dependency Imports
    Mkt_Mod --> DB_Mod
    OB_Mod --> Mkt_Mod
    OB_Mod --> DB_Mod
    Risk_Mod --> DB_Mod
    News_Mod --> DB_Mod
    Strategy_Mod[StrategyModule] --> Mkt_Mod
    Strategy_Mod --> OB_Mod
    Strategy_Mod --> Risk_Mod
    Agt_Mod --> Strategy_Mod
    Agt_Mod --> News_Mod
    
    %% DI Constructor Injections
    Mkt_Svc -->|injects| YF_Prov
    Mkt_Res -->|injects| Mkt_Svc
    OB_Res -->|injects| Mkt_Svc
    OB_Res -->|injects| DB_Svc
    Risk_Res -->|injects| Risk_Svc
    Risk_Svc -->|injects| DB_Svc
    News_Res -->|injects| News_Svc
    News_Svc -->|injects| DB_Svc
    Strat_Svc -->|injects| Mkt_Svc
    Strat_Svc -->|injects| Risk_Svc
    Orch_Svc -->|injects| Mkt_Res
    Orch_Svc -->|injects| OB_Res
    Orch_Svc -->|injects| Risk_Res
    Orch_Svc -->|injects| News_Res
    Orch_Svc -->|injects| Strat_Svc
    Orch_Svc -->|injects| DB_Svc
```

---

## 3. Data Flow / Sequence Diagram

The sequence diagram below shows the flow when a client requests trading safety validation.

```mermaid
sequenceDiagram
    autonumber
    actor Client as MCP Client / Terminal
    participant Orch as OrchestratorService
    participant MktRes as MarketResource
    participant OBRes as OrderBookResource
    participant Tools as Core Analytics Tools
    participant NewsRes as NewsResource
    participant StratAgent as StrategyAgent
    participant LLM as LLM Orchestration
    participant DB as SQLite DB

    Client->>Orch: ToolCall: generate_trading_memo(ticker)
    activate Orch
    
    Note over Orch: Step 1: Fetch Shared Resources
    Orch->>MktRes: getMarketData(ticker)
    MktRes-->>Orch: MarketResource JSON
    Orch->>OBRes: getOrderbook(ticker)
    OBRes-->>Orch: OrderBookResource JSON

    Note over Orch: Step 2: Parallel Analytics Execution
    par Volatility & Liquidity
        Orch->>Tools: scan_market(ticker)
        Tools-->>Orch: spread, volatility, depth metrics
    and Flow Toxicity
        Orch->>Tools: analyze_order_flow_toxicity(ticker)
        Tools-->>Orch: VPIN metric
    and Spoofing Detection
        Orch->>Tools: detect_spoofing(ticker)
        Tools-->>Orch: Spoofing triggers (buy/sell wall pressure)
    and Risk Limits
        Orch->>Tools: analyze_risk(account)
        Tools-->>Orch: VaR95, drawdown, exposure
    end

    Note over Orch: Step 3: Sentiment Check
    Orch->>NewsRes: getNews(ticker)
    NewsRes-->>Orch: Sentiment score, breaking news

    Note over Orch: Step 4: Rule-Based Strategy Execution
    Orch->>Tools: optimize_execution(toxicity, liquidity, volatility, spoofing)
    Tools-->>Orch: Strategy = WAIT/TWAP/VWAP/ICEBERG/MARKET

    Note over Orch: Step 5: Plain English Generation
    Orch->>StratAgent: Prompt: strategy_prompt(inputs, recommended_strategy)
    StratAgent->>LLM: Generate natural language explanation
    LLM-->>StratAgent: "Explanation text..."
    StratAgent-->>Orch: Explained Strategy

    Note over Orch: Step 6: Persist Signal
    Orch->>DB: INSERT INTO signals / memos
    DB-->>Orch: Persisted

    Orch-->>Client: structured memo { ticker, timestamp, liquidity, toxicity, spoofing, volatility, risk, news, recommendation, confidence, reasoning }
    deactivate Orch
```

---

## 4. Tool & Resource Contract Table

| Primitive Type | URI / Tool Name | Input Schema (Zod) | Output Schema (Zod) |
| :--- | :--- | :--- | :--- |
| **Resource** | `market://{ticker}` | N/A (URI param: `ticker`) | `MarketResourceSchema`: currentPrice, ohlc, vwap, spread, volume, marketDepth, timestamp |
| **Resource** | `orderbook://{ticker}` | N/A (URI param: `ticker`) | `OrderBookResourceSchema`: bidLevels[], askLevels[], marketDepth, orderImbalance, liquidityScore, timestamp |
| **Resource** | `risk://{account}` | N/A (URI param: `account`) | `RiskResourceSchema`: currentExposure, pnl, var95, var99, expectedShortfall, maxDrawdown, leverage, suggestedMaxPositionSize, timestamp |
| **Resource** | `news://{ticker}` | N/A (URI param: `ticker`) | `NewsResourceSchema`: economicCalendar[], breakingNews[], sentimentScore, sentimentBreakdown, timestamp |
| **Tool** | `scan_market` | `ticker: string` | `price: number, spread: number, volatility: number, liquidityScore: number, timestamp: number` |
| **Tool** | `analyze_order_flow_toxicity` | `ticker: string, bucketSize?: number` | `vpin: number, toxicityStatus: 'LOW'\|'MEDIUM'\|'HIGH', timestamp: number` |
| **Tool** | `detect_spoofing` | `ticker: string` | `spoofingDetected: boolean, direction: 'BUY'\|'SELL'\|'NONE', spoofingDetails: string, timestamp: number` |
| **Tool** | `analyze_liquidity` | `ticker: string, orderSize?: number` | `liquidityScore: number, estimatedSlippagePercent: number, depthSummary: string, timestamp: number` |
| **Tool** | `optimize_execution` | `vpin: number, spread: number, volatility: number, spoofingDetected: boolean` | `recommendedStrategy: 'WAIT'\|'TWAP'\|'VWAP'\|'ICEBERG'\|'MARKET', confidence: number, reasoning: string` |
| **Tool** | `analyze_risk` | `account: string, positionTicker: string, proposedSize: number` | `var95: number, expectedShortfall: number, portfolioDrawdown: number, riskApproved: boolean, comments: string` |
| **Tool** | `backtest_strategy` | `strategy: 'TWAP'\|'VWAP'\|'MARKET', ticker: string, days?: number` | `sharpeRatio: number, totalReturn: number, maxDrawdown: number, winRate: number, tradesCount: number` |
| **Tool** | `generate_trading_memo` | `ticker: string, account: string` | `ticker: string, timestamp: number, recommendation: string, confidence: number, reasoning: string, metrics: object` |

---

## 5. Database Schema (ERD)

```mermaid
erDiagram
    orders {
        string id PK
        string symbol
        string side
        real quantity
        real price
        string status
        datetime created_at
        datetime updated_at
    }

    trades {
        string id PK
        string order_id FK
        string symbol
        real quantity
        real price
        datetime executed_at
    }

    orderbook_snapshots {
        string id PK
        string symbol
        text bids
        text asks
        datetime timestamp
    }

    risk {
        string id PK
        string symbol
        real var_95
        real cvar_95
        real sharpe_ratio
        real max_drawdown
        datetime calculated_at
    }

    signals {
        string id PK
        string symbol
        string signal_type
        real confidence
        datetime generated_at
    }

    strategies {
        string id PK
        string name
        string description
        string status
        text parameters
        datetime created_at
        datetime updated_at
    }

    news {
        string id PK
        string title
        string content
        string source
        string url
        datetime published_at
        datetime fetched_at
    }

    logs {
        string id PK
        string level
        string message
        text context
        datetime created_at
    }

    trading_memos {
        string id PK
        string ticker
        datetime timestamp
        text liquidity_metrics
        text toxicity_metrics
        text spoofing_metrics
        text volatility_metrics
        text risk_metrics
        text news_sentiment
        string recommendation
        real confidence
        text reasoning
    }

    orders ||--o{ trades : "executes"
```

---

## 6. Decision Logic Table for `optimize_execution`

The logic in `optimize_execution` is strictly deterministic. The following table specifies the execution rules:

| Rule ID | Toxicity (VPIN) | Spread (bps) | Volatility (daily std dev) | Spoofing Detected | Recommended Strategy | Rationale / Rule Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R1** | Any | Any | Any | **True** | `WAIT` | **Spoofing Alert**: Large manipulative orders present. High risk of adverse selection. |
| **R2** | `> 0.45` | Any | Any | Any | `WAIT` | **Toxic Order Flow**: VPIN exceeds threshold. Adverse selection risk high. |
| **R3** | `> 0.35` | Any | Any | Any | `TWAP` | **Mild Toxicity**: Slow execution over time to minimize routing to informed counterparties. |
| **R4** | Any | `> 10` | Any | Any | `ICEBERG` | **Illiquid Book**: Large spreads mean crossing the book is expensive. Slice orders to rest inside the book. |
| **R5** | Any | Any | `> 0.03` | Any | `TWAP` | **Abnormal Volatility**: High market standard deviation. Smooth volatility exposure. |
| **R6** | `< 0.30` | `< 3` | `< 0.01` | **False** | `MARKET` | **Safe Liquid Market**: Low toxicity, tight spread, low volatility. Immediate execution. |
| **R7** | Default | Default | Default | **False** | `VWAP` | **Standard Liquid Market**: Balanced metrics. Execute inline with historical volume profiles. |

---

## 7. Dashboard Wireframe Flow

The UI consists of 6 presentation panels. The entry point of the live demo lands on the **Recommendation Panel**.

```mermaid
graph TD
    subgraph Dashboard Layout
        RecPanel[1. Recommendation Panel *Live Demo Landing*]
        MarketPanel[2. Market Overview Panel]
        OBHeatmap[3. Order Book Heatmap]
        VPINPanel[4. Order Flow / VPIN Panel]
        SpoofPanel[5. Spoofing Panel]
        RiskPanel[6. Risk Panel]
    end

    %% Data bindings
    ToolMemo[generate_trading_memo] -->|feeds| RecPanel
    ResMarket[market:// ticker] -->|feeds| MarketPanel
    ResOB[orderbook:// ticker] -->|feeds| OBHeatmap
    ToolTox[analyze_order_flow_toxicity] -->|feeds| VPINPanel
    ToolSpoof[detect_spoofing] -->|feeds| SpoofPanel
    ResRisk[risk:// account] -->|feeds| RiskPanel
```

---

## 8. Agent Prompt Templates

These prompts will be registered using `@Prompt` decorators on class methods.

### 8.1. RiskAgent Prompt
```
Name: risk_agent_prompt
Description: Prompt for analyzing exposure, drawdowns, and Value at Risk (VaR) compliance.

Template:
You are the institutional Risk Agent of a quantitative trading desk.
Analyze the following account risk parameters:
- Total Notional Exposure: ${exposure}
- Unrealized PnL: ${pnl}
- Value at Risk (VaR 95%): ${var95}
- Portfolio Max Drawdown: ${maxDrawdown}
- Current Account Leverage: ${leverage}
- Suggested Position size limit: ${suggestedMaxPositionSize}

Determine whether the current risk levels are SAFE, WARNING, or CRITICAL. Provide a concise, action-oriented report outlining any violations of risk limits.
```

### 8.2. LiquidityAgent Prompt
```
Name: liquidity_agent_prompt
Description: Prompt for assessing depth, bid-ask spread, and slippage profiles.

Template:
You are the Liquidity Agent for the execution desk.
Evaluate these current market liquidity metrics:
- Bid-Ask Spread: ${spread} bps
- Order Book Imbalance: ${orderImbalance}
- Liquidity Score (0-100): ${liquidityScore}
- Expected Slippage (for normal order): ${slippage}%

Analyze the order book depth and describe the immediate market impact of trading. Focus on execution slippage and depth exhaustion.
```

### 8.3. ToxicityAgent Prompt
```
Name: toxicity_agent_prompt
Description: Prompt for evaluating order flow toxicity and VPIN.

Template:
You are the Order Flow Toxicity Agent.
Evaluate the current Volume-Synchronized Probability of Toxicity (VPIN):
- VPIN: ${vpin}
- Status: ${toxicityStatus}

Analyze whether informed traders (toxic flow) dominate the order flow. Explain if entering market orders is structurally safe, or if market makers are likely to pull liquidity.
```

### 8.4. SpoofingAgent Prompt
```
Name: spoofing_agent_prompt
Description: Prompt for identifying market manipulation, spoof walls, and fake liquidity.

Template:
You are the Spoofing and Order Book Manipulation Detection Agent.
Review the following order book anomalies:
- Spoofing Detected: ${spoofingDetected}
- Direction: ${direction}
- Details: ${spoofingDetails}

Provide an analysis of order book manipulation. Explain if large buy or sell walls are resting artificially to force prices up or down, and describe the risk of executing against this artificial price pressure.
```

### 8.5. VolatilityAgent Prompt
```
Name: volatility_agent_prompt
Description: Prompt for evaluating short-term price variance and realized volatility.

Template:
You are the Volatility Agent.
Review current price volatility metrics:
- Realized Volatility: ${volatility}
- Historical daily standard deviation: ${dailyStdDev}

Assess whether volatility is abnormal. Explain the implications of this volatility on slippage variance and execution timing.
```

### 8.6. NewsAgent Prompt
```
Name: news_agent_prompt
Description: Prompt for summarizing economic events and sentiment scores.

Template:
You are the Macro News Sentiment Agent.
Summarize the sentiment and potential impact of the following news headlines and calendar events:
- sentimentScore: ${sentimentScore} (scale -1 to +1)
- Sentiment Breakdown: ${sentimentBreakdown}
- Economic Calendar: ${economicCalendar}
- Breaking News Headlines: ${breakingNews}

Evaluate whether news flow presents an imminent tail-risk or event-risk.
```

### 8.7. StrategyAgent Prompt
```
Name: strategy_agent_prompt
Description: Prompt for synthesizing all agent reports and generating execution strategy memos.

Template:
You are the Chief Strategy Agent of the trading desk.
Your desk requires an execution recommendation based on the combined reports of the specialist agents:
- Volatility: ${volatilityReport}
- Liquidity: ${liquidityReport}
- Toxicity: ${toxicityReport}
- Spoofing: ${spoofingReport}
- Risk: ${riskReport}
- News Sentiment: ${newsReport}

The deterministic execution engine has selected:
RECOMMENDED STRATEGY: ${recommendedStrategy} (Confidence: ${confidence})

Write a brief, plain-English executive summary (the "Trading Memo") explaining to the portfolio manager why this strategy is recommended. Do not override the decision. Justify it using the metrics provided.
```
