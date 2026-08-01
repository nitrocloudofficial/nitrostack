# RemitWise AI – Multi-Agent Workflow Specification

This document details the step-by-step end-to-end execution workflow of the RemitWise AI platform.

---

## 🔄 End-to-End Execution Flow

```
┌────────────────────────┐
│  User Interface / MCP  │
└───────────┬────────────┘
            │ 1. Submits Natural Language Query / Form Request
            ▼
┌────────────────────────┐
│  FastAPI /agent/chat   │
└───────────┬────────────┘
            │ 2. Hands query to Orchestrator
            ▼
┌────────────────────────────────────────────────────────┐
│                   OrchestratorAgent                    │
│  - Selects Planner (Ollama -> Mock -> RuleBased)      │
│  - Generates Execution Plan & Intent Steps             │
└───────────┬────────────────────────────────────────────┘
            │ 3. Dispatches tasks concurrently to specialized sub-agents
            ├──────────────────────┬──────────────────────┬──────────────────────┐
            ▼                      ▼                      ▼                      ▼
┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐
│    ExchangeAgent     ││    ProviderAgent     ││   ComplianceAgent    ││    TrackingAgent     │
│ (Frankfurter Live API││ (5 Providers Compare ││(10 Country Regulations││(Transfer Status Sync │
│ Rates & Time-series) ││ Fees & Payouts)      ││ KYC/AML Thresholds)  ││ Delivery Timelines)  │
└───────────┬──────────┘└───────────┬──────────┘└───────────┬──────────┘└───────────┬──────────┘
            │                      │                      │                      │
            └──────────────────────┼──────────────────────┴──────────────────────┘
                                   │ 4. Sub-agents return results to Merger Engine
                                   ▼
┌────────────────────────────────────────────────────────┐
│                   Results Merger                       │
│  - Aggregates sub-agent data                           │
│  - Calculates Optimal Timing Confidence Meter          │
│  - Ranks providers by Net Payout                       │
│  - Synthesizes final actionable response summary        │
└───────────┬────────────────────────────────────────────┘
            │ 5. Returns unified JSON Response
            ▼
┌────────────────────────┐
│  React Dashboard UI    │
│  - Live Ticker Bar     │
│  - Best Deal Highlight │
│  - Provider Table      │
│  - Confidence Meter    │
│  - Compliance Modal    │
└────────────────────────┘
```

---

## 📑 Detailed Step-by-Step Breakdown

### Step 1: User Request Ingestion
- The user enters a natural language query in the chat widget (e.g. *"Should I send $1,000 USD to India now or wait? Compare Wise and Remitly"*) or interacts with quick-calculator inputs on the RemitWise AI dashboard.
- Frontend submits a request payload to `POST /agent/chat`.

### Step 2: Intent Classification & Dynamic Planning
- The `OrchestratorAgent` receives the request payload.
- It attempts natural language planning using `OllamaProvider` running `llama3.1`.
- If Ollama is offline or experiences latency/model missing errors, the orchestrator automatically invokes `MockProvider` or `RuleBasedPlanner`.
- The planner analyzes intent and outputs structured execution steps:
  1. `ExchangeAgent`: Fetch live exchange rate (`USD` -> `INR`) and historical 7-day trend.
  2. `ProviderAgent`: Query providers for $1,000 transfer, compare fees and net payout.
  3. `ComplianceAgent`: Verify INR regulatory requirements for $1,000 transfer.

### Step 3: Concurrent Agent Execution
- Sub-agents run concurrently in non-blocking tasks:
  - **ExchangeAgent**: Connects to Frankfurter API, retrieves mid-market rate ($1 USD = ₹86.42 INR) and daily rate history.
  - **ProviderAgent**: Calculates payout for Wise ($86.12 effective rate = ₹86,120), Remitly ($85.80 effective rate = ₹85,631), Western Union, Revolut, and OFX.
  - **ComplianceAgent**: Checks Indian remittance regulations (`data/compliance_rules.json`), confirming Tier 1 KYC with standard ID and address proof requirement.

### Step 4: Data Synthesis & Recommendation Logic
- The `Merger` engine merges raw JSON data from all active sub-agents.
- Calculates **Savings Counter**: Highlights extra payout amount compared to market average.
- Calculates **Confidence Meter**: Evaluates rate trend stability and timing prediction confidence score.
- Generates a human-friendly advisory text summary.

### Step 5: Rendering & Interactive Feedback
- Frontend receives structured JSON payload and updates state:
  - **Live Ticker**: Displays currency rate updates in real time.
  - **Confidence Meter Component**: Shows recommendation status ("Send Now" vs "Hold").
  - **Provider Comparison Cards**: Ranks options visually with best deal badges.
  - **Savings Counter**: Shows user exact savings achieved by selecting recommended provider.
