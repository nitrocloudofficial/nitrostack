<div align="center">

```text
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   ██████╗██╗      █████╗ ██╗███╗   ███╗                              ║
║  ██╔════╝██║     ██╔══██╗██║████╗ ████║                              ║
║  ██║     ██║     ███████║██║██╔████╔██║                              ║
║  ██║     ██║     ██╔══██║██║██║╚██╔╝██║                              ║
║  ╚██████╗███████╗██║  ██║██║██║ ╚═╝ ██║                              ║
║   ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝                              ║
║                                                                      ║
║  ███████╗██╗  ██╗██╗███████╗██╗     ██████╗                          ║
║  ██╔════╝██║  ██║██║██╔════╝██║     ██╔══██╗                         ║
║  ███████╗███████║██║█████╗  ██║     ██║  ██║                         ║
║  ╚════██║██╔══██║██║██╔══╝  ██║     ██║  ██║                         ║
║  ███████║██║  ██║██║███████╗███████╗██████╔╝                         ║
║  ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═════╝                          ║
║                                                                      ║
║  CLAIMSHIELD : Professional Data-Driven Orchestration                ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

# ClaimShield MCP Server

### A Data-Driven Context Intelligence Engine for Insurance Claim Orchestration

**Verify data. Enforce compliance. Eliminate AI hallucinations.**

[![Version](https://img.shields.io/badge/version-v1.0.0-6EE7B7?style=flat-square)](#)
[![TypeScript](https://img.shields.io/badge/typescript-5.3%2B-3178C6?style=flat-square&logo=typescript&logoColor=white)](#)
[![NitroStack](https://img.shields.io/badge/NitroStack-core-4F46E5?style=flat-square)](#)
[![License](https://img.shields.io/badge/Open%20Source-Yes-brightgreen?style=flat-square)](#)
[![Status](https://img.shields.io/badge/status-MVP-purple?style=flat-square)](#)

[Overview](#overview) &middot; [Architecture](#architecture) &middot; [The Orchestration Pipeline](#the-orchestration-pipeline) &middot; [MCP Tools](#mcp-tools) &middot; [Quick Start](#quick-start)

</div>

---

## Overview

ClaimShield merges two powerful concepts into a single, highly strictly controlled Model Context Protocol (MCP) server:

1. **A Rules-Based Risk Engine** that programmatically calculates claim readiness, compliance blockers, and risk scores using verified data.
2. **A Multi-Agent Orchestrator** that securely routes AI logic, ensuring that no generative language model can guess, hallucinate, or fabricate legal and medical facts.

The core problem with utilizing generative AI in the insurance sector is the risk of fabricated policy knowledge. ClaimShield solves this by treating verified context retrieval as the mandatory first step before any AI generation takes place. 

> **ClaimShield is not a generative chatbot or a generic conversational AI.** 
> It is an orchestration engine that leverages strict tool schemas and verified data repositories. Final claim adjudication always remains with human insurance adjusters.

---

## Core Philosophy

```
Does the user's claim align perfectly with verified, hardcoded legal and cost data?
```

That is the primary question ClaimShield answers. It forces the AI to check its assumptions against a verified database before giving the user any actionable advice.

| The Industry Challenge | The ClaimShield Approach |
|---|---|
| AI models are highly prone to hallucinating complex insurance clauses, deadlines, and compliance rules. | ClaimShield forces the AI to use the `query_irda_regulations` tool, completely preventing it from inventing regulatory knowledge. |
| AI struggles with accurate, local market pricing for repairs and medical treatments. | The engine silently routes damage estimates to the `query_standard_repair_costs` database, flagging potential fraud instantly. |

---

## Architecture

ClaimShield follows Enterprise Domain-Driven Design (DDD). It is organized into strict, decoupled modules that plug directly into the NitroStack dependency injection container.

```
┌─────────────────────────────────┐
│   Client Layer                  │   ChatGPT / Claude / Custom Client
│   (Any MCP-capable client)      │   Communicates via HTTP or STDIO
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│   NitroStack MCP Gateway        │   Handles Zod Validation, Routing,
│   (claimshield-server)          │   and strict schema enforcement
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│   ClaimShield Engine            │   Actions Module
│   (Multi-Agent Prompts)         │   Readiness Module
│                                 │   Verified Data Module
└───────────────┬─────────────────┘
                │
┌───────────────▼─────────────────┐
│   Local Data Layer              │   deadlines.ts
│   (Verified Truth Sources)      │   regulations.ts
│                                 │   repair-costs.ts
└─────────────────────────────────┘
```

The system requires the client LLM to act as a **Manager**. Instead of answering a user directly, the Manager must dispatch sub-agents (the Legal Agent and the Fraud Agent) to fetch verified data from the Local Data Layer before proceeding.

---

## The Orchestration Pipeline

When a user reports a new incident, the system strictly enforces the following execution path:

| Phase | Action | Description |
|---|---|---|
| 1 | **Incident Capture** | The system automatically captures the exact timestamp from the server clock to prevent timeline fraud, generating a structured incident record. |
| 2 | **Fraud Estimation** | The `agent-fraud-estimator` is invoked. It checks the user's provided damage estimate against standard local market rates. |
| 3 | **Compliance Evaluation** | The Denial Rules Engine scans the incident for missing documents (like an FIR) and policy lapses, generating a strict Risk Score (0 to 100). |
| 4 | **Legal Verification** | For every compliance blocker found, the `agent-legal-research` is invoked to pull the exact regulatory clause from the database. |
| 5 | **Action Plan Generation** | The system outputs a prioritized, actionable checklist of exact steps the user must take to save their claim. |
| 6 | **Document Generation** | If the risk is high, the AI dynamically generates a formal Appeal Letter utilizing the verified legal citations gathered in Phase 4. |

---

## MCP Tools

The server exposes the following critical tools to the AI client:

* `create_incident`: Logs the base facts of the event safely.
* `assess_urgency`: Evaluates if immediate medical or safety intervention is required.
* `evaluate_claim_readiness`: Runs the strict Denial Rules Engine against the incident.
* `create_action_plan`: Generates the strict checklist based on the risk factors.
* `generate_appeal_letter`: Drafts formal letters injecting verified regulations.
* `query_irda_regulations`: The isolated, verified legal knowledge base.
* `query_standard_repair_costs`: The isolated, verified market cost database.

---

## Quick Start

### Prerequisites
* Node.js v20+ 
* TypeScript 5.3+

### Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### Build & Run

Compile the strict Domain-Driven modules into the production bundle:

```bash
npm run build
```

Start the MCP Server in dual mode (STDIO and HTTP):

```bash
npm start
```

Your server is now live and ready to securely orchestrate insurance claims!
