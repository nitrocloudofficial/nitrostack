# RemitWise AI – System Architecture Blueprint

This document details the high-level system architecture, multi-agent framework design, fallback strategies, and technology stack used in RemitWise AI.

---

## 🏛️ High-Level System Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │           RemitWise AI Frontend              │
                               │  (Vite + React 19 + TypeScript + Tailwind)   │
                               └──────────────────────┬───────────────────────┘
                                                      │ HTTP / REST API
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       FastAPI Web Server Layer                                         │
│                                  (app.py / CORS / OpenAPI Docs)                                        │
└─────────────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                                      │
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          Orchestrator Agent                                            │
│                                (orchestrator.py / OrchestratorAgent)                                  │
│                                                                                                        │
│    ┌──────────────────────────────────────────────────────────────────────────────────────────────┐    │
│    │                             3-Tier Resilient Fallback Engine                                 │    │
│    │                                                                                              │    │
│    │     ┌─────────────────────┐      Offline / Error     ┌─────────────────────┐                 │    │
│    │     │ Tier 1: Ollama LLM  ├─────────────────────────►│ Tier 2: MockProvider│                 │    │
│    │     │ (Local llama3.1)    │                          │ (Canned JSON)       │                 │    │
│    │     └─────────────────────┘                          └──────────┬──────────┘                 │    │
│    │                                                                 │ Malformed JSON             │    │
│    │                                                                 ▼                            │    │
│    │                                                      ┌─────────────────────┐                 │    │
│    │                                                      │ Tier 3: RuleBased   │                 │    │
│    │                                                      │ (Deterministic)     │                 │    │
│    │                                                      └─────────────────────┘                 │    │
│    └──────────────────────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                                      │ Delegates Execution
                         ┌────────────────────────────┼────────────────────────────┐
                         ▼                            ▼                            ▼
              ┌────────────────────┐       ┌────────────────────┐       ┌────────────────────┐
              │   Exchange Agent   │       │   Provider Agent   │       │  Compliance Agent  │
              │ (exchange_agent.py)│       │ (provider_agent.py)│       │(compliance_agent.p)│
              └──────────┬─────────┘       └──────────┬─────────┘       └──────────┬─────────┘
                         │                            │                            │
                         ▼                            ▼                            ▼
              ┌────────────────────┐       ┌────────────────────┐       ┌────────────────────┐
              │ Exchange Service   │       │ Provider Service   │       │ Compliance Service │
              │ (Frankfurter API)  │       │ (providers.json)   │       │(compliance_rules.j)│
              └────────────────────┘       └────────────────────┘       └────────────────────┘
```

---

## 🤖 Agent Roles & Responsibilities

1. **Orchestrator Agent (`backend/agents/orchestrator/`)**:
   - Parses incoming requests from REST endpoints or NitroStack MCP callers.
   - Generates an execution plan by selecting the active LLM provider.
   - Handles multi-tier automatic fallback if primary LLM service is offline.
   - Merges sub-agent execution outputs into a unified JSON structure.

2. **Exchange Agent (`backend/agents/exchange/`)**:
   - Wraps `exchange_service.py` to retrieve live mid-market exchange rates.
   - Fetches historical exchange rate time-series from the Frankfurter API.
   - Performs currency conversions and rate trend calculations.

3. **Provider Comparison Agent (`backend/agents/provider/`)**:
   - Wraps `provider_service.py` to query 5 major remittance providers (Wise, Remitly, Western Union, Revolut, OFX).
   - Computes transfer fees, effective exchange rates, net payout amounts, and estimated delivery times.
   - Ranks providers according to maximum net payout.

4. **Compliance & Regulatory Agent (`backend/agents/compliance/`)**:
   - Wraps `compliance_service.py` to validate remittance corridors against regulations across 10 countries.
   - Identifies required KYC documents (Government ID, Proof of Address, Tax ID, Source of Funds).
   - Enforces daily and monthly transaction limits.

---

## 🛡️ 3-Tier Resilient Fallback Mechanics

To guarantee **100% operational availability** during hackathon demonstrations, the system incorporates a 3-tier fallback hierarchy:

- **Tier 1 (`OllamaProvider`)**: Primary natural language planner connected to local Ollama instance (`llama3.1` model).
- **Tier 2 (`MockProvider`)**: Activated automatically if Ollama server is unreachable, times out, or returns a model-not-found error.
- **Tier 3 (`RuleBasedPlanner`)**: Activated automatically if LLM output fails schema validation or JSON decoding. Uses deterministic keyword extraction and heuristics.

> **Zero Downtime Guarantee**: The backend will never crash or return a HTTP 500 status code due to LLM provider failures.

---

## 💻 Tech Stack Summary

| Technology | Layer | Purpose |
|------------|-------|---------|
| **Python 3.11+ / FastAPI** | Backend Framework | High-performance async REST API web server |
| **Pydantic v2** | Data Validation | Schema validation and type safety |
| **NitroStack SDK / MCP** | Protocol & Integration | Model Context Protocol server tools |
| **Ollama (Llama 3.1)** | Local LLM | Natural language intent recognition and planning |
| **React 19 + TypeScript** | Frontend UI | Single Page Application (SPA) dashboard |
| **Vite 8** | Build Tooling | Fast frontend development server & build tool |
| **TailwindCSS 4** | Styling | Modern, responsive UI design |
| **Framer Motion** | Animation | Smooth micro-animations and page transitions |
| **Recharts** | Data Visualization | Interactive rate trend charts |
