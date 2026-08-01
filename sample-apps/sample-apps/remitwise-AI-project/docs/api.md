# RemitWise AI – API Reference & Specifications

This document details the REST API endpoints and Model Context Protocol (MCP) server integration provided by the RemitWise AI backend.

---

## 🛠️ Global Settings & Server Information

- **Base URL**: `http://localhost:8000` (Default Local)
- **Interactive OpenAPI UI**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **OpenAPI JSON Spec**: `http://localhost:8000/openapi.json`
- **Content Type**: `application/json`

---

## 🚀 Endpoints Overview

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Health** | `/health` | `GET` | System operational status and dataset integrity checks |
| **Agent Orchestrator** | `/agent/chat` | `POST` | Multi-agent execution pipeline & natural language advisory |
| | `/agent/session` | `GET` | Retrieve session memory & historical conversation steps |
| | `/agent/session` | `DELETE` | Reset session state & clear agent memory |
| **Exchange Rates** | `/exchange/latest` | `GET` | Live mid-market exchange rate between currency pairs |
| | `/exchange/historical`| `GET` | Historical exchange rate time-series data |
| | `/exchange/convert` | `POST` | Currency conversion calculation with live rate |
| | `/exchange/currencies`| `GET` | List supported ISO 4217 currencies |
| **Providers** | `/providers/compare` | `POST` | Compare provider fees, payout amounts, and transfer speeds |
| | `/providers/list` | `GET` | Retrieve available remittance providers and supported corridors |
| **Compliance** | `/compliance/check` | `POST` | KYC/AML validation & limit check for transfer corridors |
| | `/compliance/rules` | `GET` | Query regulatory rules and required documents for target country |

---

## 🧠 Multi-Agent Orchestrator Endpoint

### `POST /agent/chat`

Submits a natural language remittance query to the OrchestratorAgent. The Orchestrator plans execution, delegates tasks to specialized sub-agents, executes them, and returns a unified JSON response with recommendations, calculations, and compliance rules.

#### Request Body
```json
{
  "query": "I want to transfer $1000 USD to INR. What is the best provider and what KYC documents do I need?",
  "source_currency": "USD",
  "target_currency": "INR",
  "amount": 1000.0,
  "source_country": "US",
  "target_country": "IN",
  "session_id": "optional-session-id"
}
```

#### Response (200 OK)
```json
{
  "query": "I want to transfer $1000 USD to INR. What is the best provider and what KYC documents do I need?",
  "execution_plan": {
    "intent": "FULL_REMITTANCE_ADVISORY",
    "planner_used": "OllamaProvider (llama3.1)",
    "confidence_score": 0.95,
    "steps": [
      {
        "agent": "ExchangeAgent",
        "action": "get_live_rate",
        "params": {"source_currency": "USD", "target_currency": "INR"}
      },
      {
        "agent": "ProviderAgent",
        "action": "compare_providers",
        "params": {"amount": 1000.0, "source_currency": "USD", "target_currency": "INR"}
      },
      {
        "agent": "ComplianceAgent",
        "action": "verify_compliance",
        "params": {"target_country": "IN", "amount": 1000.0}
      }
    ]
  },
  "results": {
    "exchange": {
      "rate": 86.42,
      "source_currency": "USD",
      "target_currency": "INR",
      "last_updated": "2026-07-26T10:00:00Z"
    },
    "provider_comparison": {
      "best_overall": "Wise",
      "max_payout": 86120.0,
      "providers": [
        {
          "name": "Wise",
          "transfer_fee": 3.50,
          "effective_rate": 86.12,
          "payout_amount": 86120.0,
          "delivery_time": "Instant (under 2 mins)",
          "rating": 4.8
        },
        {
          "name": "Remitly",
          "transfer_fee": 1.99,
          "effective_rate": 85.80,
          "payout_amount": 85631.38,
          "delivery_time": "1-3 business days",
          "rating": 4.5
        }
      ]
    },
    "compliance": {
      "status": "APPROVED",
      "target_country": "IN",
      "kyc_level": "Tier 1",
      "required_documents": [
        "Government issued ID (Passport/Aadhaar/PAN)",
        "Proof of Address"
      ],
      "max_daily_limit_usd": 10000.0,
      "compliance_notes": "Transfers under $10,000 USD require standard Tier 1 KYC verification."
    }
  },
  "summary": "For transferring $1,000 USD to INR, Wise offers the highest net payout of ₹86,120 with instant delivery. Standard Tier 1 KYC (ID & Proof of Address) is required for compliance in India."
}
```

---

## 💱 Exchange Rate Endpoints

### `GET /exchange/latest`
Returns current mid-market exchange rate powered by live Frankfurter API feed with internal LRU caching.

- **Query Parameters**:
  - `from_currency` (string, default: `"USD"`): Source ISO 4217 code.
  - `to_currency` (string, default: `"INR"`): Target ISO 4217 code.

- **Response Example**:
```json
{
  "base": "USD",
  "target": "INR",
  "rate": 86.42,
  "timestamp": "2026-07-26T10:00:00Z",
  "source": "Frankfurter API"
}
```

---

## 🏦 Provider Comparison Endpoints

### `POST /providers/compare`
Compares fees, speed, payout, and user ratings across 5 major remittance services (Wise, Remitly, Western Union, Revolut, OFX).

- **Request Body**:
```json
{
  "source_currency": "USD",
  "target_currency": "INR",
  "amount": 1000.0
}
```

- **Response Example**:
```json
{
  "source_currency": "USD",
  "target_currency": "INR",
  "amount": 1000.0,
  "comparisons": [
    {
      "provider_id": "wise",
      "provider_name": "Wise",
      "fee_usd": 3.50,
      "payout_amount": 86120.0,
      "effective_rate": 86.12,
      "estimated_delivery": "Minutes",
      "rating": 4.8
    }
  ]
}
```

---

## 🛡️ Compliance Endpoints

### `POST /compliance/check`
Validates transfer against KYC/AML rules and caps for 10 countries (US, IN, PH, MX, GB, CA, AU, EU, AE, SG).

- **Request Body**:
```json
{
  "target_country": "IN",
  "amount_usd": 5000.0
}
```

- **Response Example**:
```json
{
  "target_country": "IN",
  "compliant": true,
  "tier": "Tier 1",
  "required_documents": [
    "Government ID",
    "Proof of Address"
  ],
  "daily_limit_usd": 10000.0
}
```

---

## ⚡ MCP (Model Context Protocol) Server Tools

RemitWise AI implements MCP-compatible tools for integration with NitroStack TypeScript SDK:

1. `get_live_exchange_rate(source_currency, target_currency)`
2. `compare_remittance_providers(amount, source_currency, target_currency)`
3. `verify_corridor_compliance(target_country, amount)`
4. `get_transfer_timing_advice(source_currency, target_currency)`
