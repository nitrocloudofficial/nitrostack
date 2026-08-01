# RemitWise AI — Multi-Agent System

> **Production-quality Multi-Agent AI architecture layered on top of the existing RemitWise AI backend.**
> All existing APIs remain fully operational. The agent layer is purely additive.

---

## Architecture Overview

```
                         User / Frontend / MCP
                                  │
                    POST /agent/chat (JSON)
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │  OrchestratorAgent  │◄──── ConversationMemory
                       │  (orchestrator.py)  │      (session-scoped + metadata)
                       └──────────┬──────────┘
                                  │
                   ┌──────────────┴──────────────┐
                   │    BasePlanner Interface    │
                   └──────────────┬──────────────┘
                                  │
            ┌─────────────────────┴─────────────────────┐
            │                                           │
  ┌─────────▼─────────┐                       ┌─────────▼─────────┐
  │    LLMPlanner     │   Fallback on error   │ RuleBasedPlanner  │
  │ (Intelligent Plan)│ ────────────────────► │  (Deterministic)  │
  └─────────┬─────────┘                       └───────────────────┘
            │
  ┌─────────┴─────────┐
  │ BaseLLMProvider   │
  │ ├─ OpenAIProvider │
  │ ├─ OllamaProvider │
  │ └─ MockProvider   │
  └───────────────────┘
            │
            ▼
       ExecutionPlan
            │
            ▼
  ┌───────────────────┐
  │     Executor      │
  └─────────┬─────────┘
            │
  ┌─────────┼─────────┐
  ▼         ▼         ▼
┌───┐     ┌───┐     ┌───┐
│Ex.│     │Pr.│     │Co.│
└───┘     └───┘     └───┘
  │         │         │
  └─────────┼─────────┘
            ▼
       ┌─────────┐
       │ Merger  │
       └─────────┘
```

---

## Directory Structure

```
backend/
└── agents/
    ├── __init__.py
    ├── shared/
    │   ├── schemas.py        ← All Pydantic models (AgentRequest, AgentResponse, ExecutionPlan, etc.)
    │   ├── base_agent.py     ← Abstract BaseAgent with timing + error wrapping
    │   ├── logger.py         ← Colourised structured agent logger
    │   ├── memory.py         ← Thread-safe in-memory conversation memory (with planner tracking)
    │   └── utils.py          ← Currency/country normalisation, timing, text helpers
    ├── exchange/
    │   ├── prompt.py         ← Exchange agent system prompt
    │   ├── tools.py          ← Wrappers: get_latest_rate, convert_amount, etc.
    │   └── exchange_agent.py ← ExchangeAgent(BaseAgent) implementation
    ├── provider/
    │   ├── prompt.py         ← Provider agent system prompt
    │   ├── tools.py          ← Wrappers: compare_providers, list_providers, etc.
    │   └── provider_agent.py ← ProviderAgent(BaseAgent) with ranking logic
    ├── compliance/
    │   ├── prompt.py         ← Compliance agent system prompt
    │   ├── tools.py          ← Wrappers: get_kyc, get_aml, get_documents, etc.
    │   └── compliance_agent.py ← ComplianceAgent(BaseAgent) implementation
    └── orchestrator/
        ├── base_planner.py   ← NEW: BasePlanner abstract interface
        ├── llm_planner.py    ← NEW: LLMPlanner intelligent intent planner & entity extractor
        ├── planner.py        ← RuleBasedPlanner (deterministic fallback) & Planner alias
        ├── executor.py       ← Sequential agent runner with error isolation
        ├── merger.py         ← Response synthesis & summary generation
        ├── orchestrator.py   ← OrchestratorAgent (primary coordinator with fallback)
        └── providers/        ← NEW: Provider abstraction layer
            ├── __init__.py      ← get_llm_provider() factory
            ├── base_provider.py ← Abstract BaseLLMProvider interface
            ├── openai_provider.py ← OpenAI & OpenAI-compatible REST API client
            ├── ollama_provider.py ← Local Ollama provider client
            └── mock_provider.py   ← Offline deterministic test provider
```

---

## Planning Pipeline & Automatic Fallback

The system utilizes a dual-planner architecture for maximal reliability:

1. **Primary Planner (`LLMPlanner`)**:
   - Analyzes natural language query context.
   - Extracts structured entities (`base_currency`, `target_currency`, `amount`, `from_country`, `to_country`).
   - Determines optimal specialist agents and execution sequence.
   - Validates JSON output via Pydantic (`LLMPlanResponseModel`).
   - Supports configurable retries and timeout protection.

2. **Automatic Fallback (`RuleBasedPlanner`)**:
   - If `LLMPlanner` experiences a network timeout, rate limit, API error, or invalid JSON output, `OrchestratorAgent` automatically falls back to `RuleBasedPlanner`.
   - The user query completes successfully without error or degradation of specialist agent functions.

---

## Supported LLM Providers

The provider abstraction (`BaseLLMProvider`) allows swapping LLM backends via environment variables:

| Provider | `LLM_PROVIDER` | Environment Variables | Endpoint |
|----------|----------------|-----------------------|----------|
| **Mock** | `mock` | (None required) | Offline in-memory simulation |
| **OpenAI** | `openai` | `OPENAI_API_KEY`, `OPENAI_MODEL` | `https://api.openai.com/v1` |
| **Azure OpenAI** | `openai` | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | Custom Azure Endpoint |
| **OpenRouter** | `openai` | `OPENAI_API_KEY`, `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` |
| **Groq** | `openai` | `OPENAI_API_KEY`, `OPENAI_BASE_URL` | `https://api.groq.com/openai/v1` |
| **Together AI** | `openai` | `OPENAI_API_KEY`, `OPENAI_BASE_URL` | `https://api.together.xyz/v1` |
| **Ollama** | `ollama` | `OLLAMA_HOST`, `OLLAMA_MODEL` | `http://localhost:11434` |

---

## LLM JSON Output Contract

When `LLMPlanner` runs, it enforces the following strict JSON schema:

```json
{
  "agents": [
    "ExchangeAgent",
    "ProviderAgent",
    "ComplianceAgent"
  ],
  "reasoning": "User requested currency conversion, provider comparison, and compliance requirements.",
  "context": {
    "base_currency": "USD",
    "target_currency": "INR",
    "amount": 1000,
    "from_country": "US",
    "to_country": "IN"
  },
  "confidence": 0.98
}
```

---

## Configuration Guide

Configure LLM settings via environment variables (e.g. in `.env` or system environment):

```bash
# Provider selection: 'ollama', 'openai', or 'mock' (default: 'ollama')
LLM_PROVIDER=ollama

# Ollama settings (default: http://localhost:11434 with llama3.1)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1

# OpenAI / OpenAI-Compatible settings
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Tuning & Timeouts
TEMPERATURE=0.0
MAX_TOKENS=500
TIMEOUT=5.0
```

---

## API Endpoints

### `POST /agent/chat`

Main conversational endpoint.

**Request:**
```json
{
  "query": "Send 1000 USD to India. Cheapest provider and KYC docs?",
  "session_id": "user-abc-123",
  "context": {
    "base_currency": "USD",
    "target_currency": "INR",
    "amount": 1000,
    "from_country": "US",
    "to_country": "IN"
  }
}
```

**Response:**
```json
{
  "session_id": "user-abc-123",
  "query": "Send 1000 USD to India. Cheapest provider and KYC docs?",
  "agents_used": ["exchange", "provider", "compliance"],
  "plan": [
    {"agent": "exchange", "reason": "Exchange rate and conversion query (USD→INR) for 1000", "priority": 1},
    {"agent": "provider", "reason": "Provider comparison and recommendation (US→IN)", "priority": 2},
    {"agent": "compliance", "reason": "KYC/AML compliance requirements for IN", "priority": 3}
  ],
  "results": {
    "exchange": { "status": "success", "data": { "exchange_rate": {...}, "conversion": {...} } },
    "provider": { "status": "success", "data": { "best_provider": "wise", ... } },
    "compliance": { "status": "success", "data": { "documents": ["Passport", "Aadhaar Card"], ... } }
  },
  "summary": "💱 Current USD/INR rate: 96.5600 (as of 2026-07-25). You will receive approximately ₹96,560.00 for $1,000.00. 🏦 For the US → IN corridor, 3 provider(s) are available. Top recommendation: Wise. 📋 Compliance for IN: KYC verification required.",
  "status": "success",
  "total_execution_ms": 87.3
}
```

### `GET /agent/health`

Check agent system readiness.

### `GET /agent/session/{session_id}`

Retrieve conversation history for a session (including planner reasoning & confidence).

### `DELETE /agent/session/{session_id}`

Clear conversation memory for a session.

---

## Running Tests

```bash
cd backend

# All agent tests (including LLMPlanner & Providers)
python -m pytest tests/agents/ -v

# LLM Planner & Fallback unit tests
python -m pytest tests/agents/test_llm_planner.py -v

# Full test suite
python -m pytest tests/ -v
```

---

## Sequence Diagram

```
User         /agent/chat     Orchestrator   LLMPlanner   RulePlanner    Executor   Agents     Merger
 │                │                │            │             │            │         │          │
 │──POST /chat──►│                │            │             │            │         │          │
 │               │──run()────────►│            │             │            │         │          │
 │               │                │──plan()───►│             │            │         │          │
 │               │                │  (try LLM) │             │            │         │          │
 │               │                │◄──plan─────│             │            │         │          │
 │               │                │ [If Fail]──┼────────────►│            │         │          │
 │               │                │◄──plan─────┼─────────────│            │         │          │
 │               │                │──execute()───────────────────────────►│         │          │
 │               │                │            │             │            │──run───►│          │
 │               │                │            │             │            │◄─resp───│          │
 │               │                │◄──responses───────────────────────────│         │          │
 │               │                │──merge()──────────────────────────────────────────────────►│
 │               │                │◄──merged──────────────────────────────────────────────────│
 │               │                │──save memory                                           │
 │               │◄─response──────│                                                        │
 │◄──JSON────────│                                                                         │
```
