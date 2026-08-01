# Rampo – AI-Powered Customer Support Intervention for Digital Banking

> Rampo is a proactive AI escalation and intervention platform for digital banking — built with MCP, TanStack Start, FastAPI, and Supabase.

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue)
![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF)
![TanStack Start](https://img.shields.io/badge/TanStack-Start-FF4154)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E)
![Status](https://img.shields.io/badge/status-live-brightgreen)
[![Live on NitroCloud](https://img.shields.io/badge/Live%20Demo-NitroCloud-0A66FF?logo=rocket)](https://scoops-ahoy-nitrostack-scoops-ahoy-amrita-university-coimbatore.app.nitrocloud.ai)

**Rampo – AI-Powered Customer Support Intervention for Digital Banking** is an [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that extends AI assistants — like Claude, Cursor, and any MCP-compatible client — with real-time customer session intelligence. It is built on [Nitrostack](https://nitrostack.ai), the fastest way to build, deploy, and share MCP apps.

**Live deployment:** [https://scoops-ahoy-nitrostack-scoops-ahoy-amrita-university-coimbatore.app.nitrocloud.ai](https://scoops-ahoy-nitrostack-scoops-ahoy-amrita-university-coimbatore.app.nitrocloud.ai)

## Table of Contents

- [Overview](#overview)
- [Live Deployment](#live-deployment)
- [What is MCP?](#what-is-mcp)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Explore More MCP Apps](#explore-more-mcp-apps)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

---

## Overview

Instead of waiting for customers to raise complaints or call support, **Rampo** continuously monitors customer interactions in a live banking session to identify signs of confusion or frustration — repeated form errors, failed SWIFT/IFSC validations, rage clicks, prolonged inactivity, or navigation loops.

When a potential issue is detected, the platform evaluates a real-time escalation risk score. Once a threshold is crossed, Rampo proactively delivers a contextual AI nudge directly inside the customer's active session — a pop-up with precise, flow-aware guidance (e.g. *"SWIFT/BIC codes must be 8 or 11 characters — try CITIUS33 for Citibank NY"*).

Support agents monitor all live sessions from a real-time Admin Dashboard and can also dispatch manual interventions. Every event is logged to Supabase and mirrored to PostHog for analytics and ROI tracking.

**Result:** customers complete their banking tasks before frustration escalates into a support ticket — reducing customer effort, lowering support costs, improving transaction success rates, and delivering a smoother, more personalised banking experience.

---

## Live Deployment

The MCP server is live and publicly accessible on **NitroCloud**:

| | |
|---|---|
| **URL** | [https://scoops-ahoy-nitrostack-scoops-ahoy-amrita-university-coimbatore.app.nitrocloud.ai](https://scoops-ahoy-nitrostack-scoops-ahoy-amrita-university-coimbatore.app.nitrocloud.ai) |
| **Platform** | [Nitrostack](https://nitrostack.ai) |
| **Status** | 🟢 Live |

To connect your MCP client to the hosted deployment, use:

```json
{
  "mcpServers": {
    "rampo-banking-escalation": {
      "url": "https://scoops-ahoy-nitrostack-scoops-ahoy-amrita-university-coimbatore.app.nitrocloud.ai"
    }
  }
}
```

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

Rampo exposes its escalation prediction engine as an MCP tool — meaning any MCP-compatible AI agent (Claude, Cursor, etc.) can call `predict_escalation_risk(session_id)` to query the live risk score of any active customer session and decide whether to intervene.

Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

---

## Architecture

<img width="1600" height="1073" alt="WhatsApp Image 2026-07-26 at 12 15 08 PM" src="https://github.com/user-attachments/assets/a2aff2bb-9017-440b-b49f-f7370ade3e2f" />

---

## Features

- **MCP-native** — exposes `predict_escalation_risk(session_id)` as an MCP tool; works with Claude, Cursor, and any MCP-compatible client
- **Full net banking portal** — 10 routes covering NEFT/RTGS/IMPS, SWIFT, deposits, withdrawals, credit score, branch locator, and an account dashboard
- **Proactive AI escalation engine** — weighted signal model (rage clicks, form failures, nav loops, idle dwell, funnel drop-offs) with per-session risk scoring
- **Flow-aware contextual nudges** — button-level nudge resolution (`swift_wire#validate_swift` → SWIFT-specific guidance, not a generic message)
- **Real-time admin dashboard** — live session monitor, one-click manual nudge dispatcher, intervention analytics and ROI tracking
- **PostHog behavioral analytics** — every click, flow step, and funnel event is captured with `flow`, `funnel_step`, and `session_id` tags
- **Durable Supabase audit log** — `journey_events` and `escalation_predictions` tables record every signal and threshold crossing
- **Deployed on Nitrostack** — reliable, hosted, and instantly shareable
- **Secure by design** — service-role keys stay server-side; anon JWT is browser-only
- **Composable** — combine with other MCP apps to build powerful AI support workflows

---

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) — React 19, SSR + Hydration |
| Router | [TanStack Router](https://tanstack.com/router) — file-based routing, navigation guards |
| Build Tool | [Vite 8](https://vitejs.dev/) via `@lovable.dev/vite-tanstack-config` |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + `tw-animate-css` |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) (Radix UI + CVA) |
| Icons | [Lucide React](https://lucide.dev/) |
| Charts | [Recharts](https://recharts.org/) |
| Forms | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Toasts | [Sonner](https://sonner.emilkowal.ski/) |
| OTP Input | [input-otp](https://github.com/guilhermerodz/input-otp) |
| Package Manager | [Bun](https://bun.sh/) with 24h supply-chain guard |
| Language | TypeScript 5.8 |

### Backend (Python)

| Layer | Technology |
|---|---|
| Framework | [FastAPI](https://fastapi.tiangolo.com/) ≥ 0.110 |
| Server | [Uvicorn](https://www.uvicorn.org/) with standard extras |
| Templates | [Jinja2](https://jinja.palletsprojects.com/) |
| HTTP Client | [httpx](https://www.python-httpx.org/) |
| LLM Agent | [LangChain](https://python.langchain.com/) + [langchain-groq](https://python.langchain.com/docs/integrations/chat/groq/) (Qwen 3.6-27B) |
| Environment | python-dotenv |
| Python Version | 3.12 |

### Data, Auth & Observability

| Layer | Technology |
|---|---|
| Database | [Supabase PostgreSQL](https://supabase.com/) with Row Level Security |
| Auth | [Supabase Auth](https://supabase.com/docs/guides/auth) — CIF-mapped email auth |
| Browser Client | `@supabase/supabase-js` v2 |
| Server Client | `supabase` Python SDK (service-role) |
| Behavioral Analytics | [PostHog](https://posthog.com/) — browser + server-side mirror |
| Real-time Messaging | Native [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) |

---

## Getting Started

### Prerequisites

- Node.js 18+ / [Bun](https://bun.sh/) (recommended)
- Python 3.12
- A [Supabase](https://supabase.com/) project
- A [PostHog](https://posthog.com/) project (optional — works offline)
- An MCP-compatible client (Claude Desktop, Cursor, etc.)

### Installation

```bash
git clone https://github.com/SudharsanSaravanan/Rampo.git
cd Rampo
npm install        # or: bun install
```

Set up the Python virtual environment:

```bash
python -m venv hack
# Linux / macOS:
source hack/bin/activate
# Windows:
hack\Scripts\activate

pip install -r requirements.txt
```

### Configuration

```bash
cp .env.example .env
# Fill in your Supabase URL, anon key, service role key, and PostHog key
```

### Run

**Terminal 1 — FastAPI Backend (capture proxy + MCP tool):**
```bash
source hack/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — React Frontend:**
```bash
npm run dev        # → http://localhost:8081
```

**Demo credentials:**
```
CIF / Username:  30014782291
Password:        Demo@12345
```

---

## Connect to an MCP Client

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "rampo-banking-escalation": {
      "command": "uvicorn",
      "args": ["app.main:app", "--port", "8000"]
    }
  }
}
```

Restart your client and the `predict_escalation_risk` tool will be available to your AI assistant. The tool accepts a `session_id` and returns:

```json
{
  "session_id": "abc123",
  "funnel_step": "swift_wire#validate_swift",
  "risk_score": 45.0,
  "level": "elevated",
  "nudge_threshold_crossed": true,
  "nudge": "SWIFT validate keeps failing: BIC codes must be 8 or 11 chars...",
  "reasons": ["failed_form x3 (+45)"],
  "signal_counts": { "failed_form": 3 }
}
```

### Escalation Risk Levels

| Score | Level | Action |
|---|---|---|
| 0 – 44 | `low` | No intervention |
| 45 – 69 | `elevated` | Proactive AI nudge dispatched |
| 70 – 100 | `high` | Escalate to live support agent |

### Signal Weights Reference

| Signal | Weight | Cap |
|---|---|---|
| `rage_click` | 18 | 5 events |
| `failed_form` | 15 | 4 events |
| `funnel_dropoff` | 12 | 2 events |
| `nav_back_forth` | 10 | 6 events |
| `help_search` | 9 | 3 events |
| `repeated_visit` | 8 | 3 events |
| `long_dwell_no_action` | 6 | 2 events |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# PostHog Cloud (behavioral analytics)
POSTHOG_KEY=phc_your_posthog_public_key
POSTHOG_HOST=https://us.i.posthog.com

# Supabase — database, auth, and audit logs
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# FastAPI capture proxy
APP_PORT=8000

# Vite-exposed (browser-readable) — VITE_ prefix required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_POSTHOG_KEY=phc_your_posthog_public_key
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_CAPTURE_API=http://localhost:8000/api

# Optional — Groq API key for the LLM agent
GROQ_API_KEY=your_groq_api_key
```

> **Security:** Never commit `.env` or `.env.local`. Only `.env.example` (with placeholder values) is safe to commit.

---

## Database Setup

Run the SQL script in your **Supabase SQL Editor**:

```
supabase/schema.sql
```

This creates all tables, triggers, RLS policies, and functions:

| Table | Purpose |
|---|---|
| `customer_profiles` | CIF, name, address, KYC status |
| `bank_accounts` | Savings / Current / Loan accounts |
| `transactions` | Full transaction history |
| `beneficiaries` | Saved payees (IFSC, IBAN, SWIFT) |
| `support_cases` | Raised support tickets |
| `customer_sessions` | Active session rows linked to auth user |
| `journey_events` | Per-event audit log (rage_click, failed_form, …) |
| `escalation_predictions` | Risk score snapshots at threshold crossing |

Seed a demo user via the Supabase Auth dashboard:
- **Email format:** `cif_30014782291@rampo.internal`
- **Password:** `Demo@12345`

---

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

**Start building:** [https://nitrostack.ai](https://nitrostack.ai)

---

## Explore More MCP Apps

-  Discover and share MCP projects with the community on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
-  Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai/apps)

---

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does Rampo do exactly?

Rampo monitors a customer's active banking session in real time. It collects behavioral signals (rage clicks, form failures, navigation loops, idle time), scores them with a weighted risk model, and — when the score crosses a threshold — delivers a contextual AI nudge inside the customer's session. A support agent or AI assistant can also query the live risk score of any session via the MCP tool `predict_escalation_risk(session_id)`.

### Which banking flows does the nudge engine cover?

| Flow | Funnel Key |
|---|---|
| SWIFT international transfer | `swift_wire` |
| NEFT / RTGS / IMPS domestic transfer | `domestic_transfer` |
| Fixed / Recurring deposit | `deposit_open` |
| ATM / NetBanking withdrawal | `withdraw` |
| CIBIL credit score | `credit_score` |
| Loan EMI management | `loan_emi` |
| Card management | `card_manage` |
| Login failures | `login_fail` |
| Branch locator | `branch_locator` |

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop and Cursor. New clients are adding MCP support regularly.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

---

## Keywords

`BFSI & FinTech` · `Rampo` · `AI-Powered Customer Support` · `Digital Banking` · `Proactive Intervention` · `Escalation Prediction` · `MCP` · `Model Context Protocol` · `MCP server` · `MCP app` · `AI tools` · `AI agents` · `LLM tools` · `Claude MCP` · `Nitrostack` · `TanStack Start` · `FastAPI` · `Supabase` · `PostHog` · `deploy MCP server` · `build MCP app`

---

## License

MIT © 2026

---

Built with ❤️ using the Model Context Protocol on [Nitrostack](https://nitrostack.ai). Share your MCP app on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/).
