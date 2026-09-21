# finbridge-ai

> Ask any AI which government savings schemes you qualify for and it answers confidently — from memory. We measured it: **wrong in 14 of 30 runs.**

![Model Context Protocol](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue) ![Built with Nitrostack](https://img.shields.io/badge/Built%20with-Nitrostack-0A66FF) ![Status](https://img.shields.io/badge/status-live-brightgreen) ![Tests](https://img.shields.io/badge/tests-28%20passing-brightgreen) ![Hallucinations](https://img.shields.io/badge/hallucinations-0%2F30-brightgreen)

**finbridge-ai** is an [MCP (Model Context Protocol)](https://nitrostack.ai) server that gives AI assistants — Claude, Cursor, and any MCP-compatible client — **verifiable financial ground truth** for India's public savings schemes and mutual funds. Built and deployed on [Nitrostack](https://nitrostack.ai).

## Table of Contents

- [Overview](#overview)
- [The evidence](#the-evidence)
- [What is MCP?](#what-is-mcp)
- [Tools, Resources & Prompts](#tools-resources--prompts)
- [Getting Started](#getting-started)
- [Connect to an MCP Client](#connect-to-an-mcp-client)
- [How it works](#how-it-works)
- [Testing](#testing)
- [Deploy Your Own MCP App](#deploy-your-own-mcp-app)
- [Team](#team)
- [FAQ](#faq)
- [Keywords](#keywords)
- [License](#license)

## Overview

Millions of Indians are eligible for government savings schemes they never claim, because the rules are scattered across circulars and the eligibility conditions are unintuitive. The obvious fix is to ask an AI — but an AI answers from memory, and memory is where age bands, income ceilings and rule changes quietly go wrong.

**FinBridge AI replaces the guess with a lookup.** It evaluates all **7 major Indian schemes** — PMJDY, APY, PMJJBY, PMSBY, SSY, SCSS, NPS — against a rulebook sourced from **government circulars, not model memory**, and names the exact condition that failed for every rejection. It also projects mutual fund growth from **live NAV data** as an honest range, scores financial health, and explains financial terms in plain language.

> **The model explains. The code computes.**

## The evidence

We built a benchmark instead of claiming accuracy. 10 edge-case eligibility questions — someone turning 10, income exactly at a ceiling, boundary ages — each run **3 times** against both a plain LLM and FinBridge.

The baseline was **steelmanned**: the model was given the full scheme documents in context. This was a fair fight.

| Metric | Plain LLM | FinBridge AI |
|---|---|---|
| Wrong verdicts | **14 / 30** (~47%) | **0 / 30** |
| Self-contradiction across identical runs | **5 / 30** | **0 / 30** |

The second row is the one nobody expects. The same question, asked three times, got different answers — which means the same person gets different advice on different days.

**The most dangerous miss:** Atal Pension Yojana has excluded income-tax payers since October 2022. The LLM got this wrong in 2 of 3 runs — an error that would push someone to enrol in a scheme they're barred from.

Full methodology and per-question results: [`data/hallucination_benchmark.md`](data/hallucination_benchmark.md)

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI assistants securely connect to external tools, data sources, and services. Instead of being limited to what it was trained on, an AI model can call **MCP servers** to fetch live data, run actions, and integrate with real systems.

This project is one such MCP server. Learn more about building and shipping MCP apps at [nitrostack.ai](https://nitrostack.ai).

## Tools, Resources & Prompts

### 🛠️ Tools

| Tool | What it does |
|---|---|
| `check_scheme_eligibility` | Evaluates **all 7 schemes** on every call. Returns eligible *and* ineligible, each with a named reason or `failedCondition`. |
| `project_investment_growth` | Projects a SIP as a **low/high range** from live mutual fund NAV, with stated assumptions and the source fund named. Never a single confident number. |
| `calculate_financial_health` | Scores overall health with three sub-scores — savings rate, emergency fund, debt ratio — plus actionable suggestions. |
| `explain_financial_concept` | Plain-language definition, explanation, worked example and related terms from a 13-term curated glossary. |

### 📚 Resources

- `finbridge://schemes` — the codified rulebook: 7 schemes with age bands, income ceilings, gender restrictions, account and tax-payer requirements, benefits, documents, and official apply links
- `finbridge://glossary` — 13 financial terms with definitions, examples and categories

### 💬 Prompts

- `beginner_investor_advisor` — guided advice for a first-time investor
- `scheme_navigator` — walks a user profile through the scheme landscape

### 🔐 Guardrails, enforced by schema

Every tool response carries `risk_note` and `educational_only: true`. This isn't a disclaimer bolted on at the end — it's in the frozen `BaseOutput` contract that **every** tool output must extend. No tool can return without it.

## Getting Started

### Prerequisites

- **Node.js 20** (NitroCloud runs Node 20 internally — safest choice)
- An MCP-compatible client (Claude Desktop, Cursor, NitroStudio)

### Installation

```bash
git clone https://github.com/Jeevan0814/Finbridge-ai.git
cd Finbridge-ai/finbridge-ai
npm install
```

### Configuration

```bash
cp .env.example .env
```

No API keys required. `mfapi.in` is a public endpoint with no authentication.

### Run

```bash
npm run build    # compile TypeScript + bundle widgets
npm start        # production server
npm run dev      # development, hot reload
```

## Connect to an MCP Client

**Claude Desktop** — edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "finbridge-ai": {
      "command": "node",
      "args": ["/absolute/path/to/Finbridge-ai/finbridge-ai/dist/index.js"]
    }
  }
}
```

Restart the client. All 4 tools, 2 resources and 2 prompts become available.

**NitroStudio** — Add Server → Nitro Project → browse to the `finbridge-ai` folder → Open Project → Studio App Canvas.

### Try it

> *"I'm 32, male, salaried, earn ₹90,000/month and I pay income tax. Which government schemes am I eligible for?"*

```
✅ Eligible:   PMJDY, PMJJBY, PMSBY, NPS
❌ APY   — "Income-tax payers are excluded from this scheme"
❌ SSY   — "Age 32 exceeds the maximum age of 10"
❌ SCSS  — "Age 32 is below the minimum age of 60"
```

Change one field — `isTaxPayer: false` — and APY moves to eligible with the reason *"age 32 is within 18-40, has the required bank account, is not an income-tax payer."*

## How it works

```
data/schemes.json      →  eligibility.engine.ts  →  check_scheme_eligibility
(government circulars)    (deterministic rules)     (named verdicts)

mfapi.in live NAV      →  growth.service.ts      →  project_investment_growth
(3yr + 5yr CAGR)          (live → cached →          (low/high range)
                           static fallback)
```

**Separation of concerns is the design.** Data lives in JSON, validated against a frozen zod contract. Logic lives in a pure evaluator with no I/O. A tool wrapper joins them. Change a scheme rule and you edit data, not code — which is why the rulebook is auditable.

**Live data degrades gracefully.** NAV lookups try live → cached → documented static band. A dead API at 3am produces a labelled fallback, not a crash.

## Testing

```bash
npm test              # 28 unit tests
npm run sweep         # 11 integration checks through a real MCP client
npm run verify:tools  # 14 in-process checks, no transport needed
npm run audit:secrets # pre-publish secrets scan
```

`npm run sweep` drives the server through the **official MCP client SDK** — the same code path Claude uses. It caught three protocol bugs that TypeScript and unit tests could not see, including two tools that returned MCP error `-32600` to every real client while every test passed green.

Boundary cases are tested explicitly: an 18-year-old at the minimum, a 10-year-old girl child exactly at the SSY ceiling, income one rupee over a limit, and a taxpayer against the APY exclusion.

## Deploy Your Own MCP App

Want to build and ship an MCP server like this one? **[Nitrostack](https://nitrostack.ai)** lets you create, deploy, and host MCP apps in minutes — no infrastructure to manage.

👉 **Start building:** [https://nitrostack.ai](https://nitrostack.ai)

## Explore More MCP Apps

- 🌙 Discover and share MCP projects on [r/mcptothemoon](https://www.reddit.com/r/mcptothemoon/)
- 🧰 Browse a growing catalog of MCP apps on [Nitrostack](https://nitrostack.ai/apps)

## Team

Built in 24 hours with strict file ownership — no two people touched the same file.

| | Owns |
|---|---|
| **Jeevan** | Server, deployment, knowledge module, submission |
| **Deepak** | Eligibility engine + boundary tests |
| **Praneeth** | Live NAV client, growth projections, financial health |
| **Jayaram** | Scheme rulebook, glossary, hallucination benchmark |

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the ownership model and frozen-contract rule.

## FAQ

### What is an MCP server?

An MCP server implements the Model Context Protocol to expose tools, resources, and prompts that AI assistants can call. It lets an AI model take real actions and access live data.

### What does finbridge-ai do?

It gives AI assistants a verifiable rulebook for India's government savings schemes and mutual funds, so eligibility answers come from codified rules rather than model recall — with the exact failed condition named for every rejection.

### Where does the scheme data come from?

Government circulars and official scheme pages. Every scheme entry carries an `officialSource` link and notes explaining judgement calls. It is not generated from a model's memory.

### Is this financial advice?

No. Every response carries `educational_only: true` and a risk note, enforced at the schema level. Consult a SEBI-registered advisor for personalised advice.

### Which AI clients does this work with?

Any MCP-compatible client, including Claude Desktop, Cursor and NitroStudio.

### How do I deploy my own MCP app?

Use [Nitrostack](https://nitrostack.ai) to build, deploy, and host MCP apps without managing infrastructure.

## Keywords

mcp, model context protocol, mcp server, ai tools, government schemes india, PMJDY, APY, PMJJBY, PMSBY, Sukanya Samriddhi, SCSS, NPS, mutual funds, SIP calculator, NAV, financial literacy, hallucination benchmark, nitrostack, claude, cursor, typescript, zod

## License

Apache-2.0
