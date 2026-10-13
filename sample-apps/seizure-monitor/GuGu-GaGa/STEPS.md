# CREED-Lite: Complete Setup & Implementation Guide

Welcome to **CREED-Lite** (Causal Recourse Engine for Equitable Decision-Making), a production-grade Model Context Protocol (MCP) server built with the **NitroStack Framework**.

This document provides a step-by-step guide to setting up, understanding, building, running, and testing the CREED-Lite server.

---

## 📋 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Prerequisites & Basic Setup](#2-prerequisites--basic-setup)
3. [Project Directory Structure](#3-project-directory-structure)
4. [Step-by-Step Implementation Breakdown](#4-step-by-step-implementation-breakdown)
   - [Step 1: Centralized Thresholds Config](#step-1-centralized-thresholds-config)
   - [Step 2: Oracle Underwriting Scoring Engine](#step-2-oracle-underwriting-scoring-engine)
   - [Step 3: Causal Recourse Path Engine](#step-3-causal-recourse-path-engine)
   - [Step 4: Fraud Safety & Vector Detection](#step-4-fraud-safety--vector-detection)
   - [Step 5: Legal ECOA Adverse Action Disclosure](#step-5-legal-ecoa-adverse-action-disclosure)
   - [Step 6: Root Application & Health Checks](#step-6-root-application--health-checks)
5. [Running & Testing in NitroStudio](#5-running--testing-in-nitrostudio)
6. [Testing Prompts & Visual UI Widgets](#6-testing-prompts--visual-ui-widgets)
7. [Troubleshooting & FAQs](#7-troubleshooting--faqs)

---

## 1. Project Overview

CREED-Lite provides **equitable recourse** for rejected loan applicants. Instead of simply denying an applicant with a "black box" algorithm, CREED-Lite:
1. **Evaluates Underwriting Risk**: Computes a continuous, non-cliff probability score (0-100%) across 4 core credit metrics.
2. **Generates Causal Recourse Paths**: Calculates dynamic, budget-constrained paths (e.g. debt paydown, certifications, verified co-signers, salary negotiation) derived from the applicant's actual profile.
3. **Guards Against Fraud**: Audits recourse proposals for 4 industry fraud vectors (Tradeline Renting, Loan Stacking, Debt Parking, Unverified Income Inflation).
4. **Enforces ECOA Compliance**: Generates federal Regulation B (12 CFR Part 1002) adverse action codes (`ECOA-01`, `ECOA-04`, `ECOA-07`, `ECOA-09`, `ECOA-12`).

---

## 2. Prerequisites & Basic Setup

### Requirements
- **Node.js**: v18.0.0 or higher
- **Package Manager**: `npm` (v9+)
- **IDE / Environment**: NitroStudio (v1.4+)

### Basic Setup Commands

1. **Clone / Open the Directory**:
   ```bash
   cd "c:\Users\Gajula Eshwarnath\Desktop\Nitro\creed-lite"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Verify TypeScript Compilation**:
   ```bash
   npx tsc --noEmit
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## 3. Project Directory Structure

```text
creed-lite/
├── src/
│   ├── config/
│   │   └── thresholds.ts          # Centralized Single Source of Truth for all thresholds
│   ├── oracle/
│   │   ├── oracle.service.ts     # Continuous piecewise-linear scoring engine
│   │   └── oracle.tools.ts       # MCP Tools: evaluate_applicant, simulate_intervention
│   ├── causal/
│   │   ├── causal.service.ts     # Structural Causal Model path computation (PATH-A through F)
│   │   └── causal.tools.ts       # MCP Tools: get_causal_graph, find_recourse_paths
│   ├── fraud/
│   │   ├── fraud.service.ts      # Multi-vector fraud detection & rerouting logic
│   │   ├── fraud.guard.ts        # NitroStack Guard for input action validation
│   │   └── fraud.tools.ts        # MCP Tools: check_fraud_safety & audit logs
│   ├── legal/
│   │   └── legal.tools.ts        # MCP Tools: get_adverse_action_reasons & ECOA resources
│   ├── common/
│   │   ├── audit.interceptor.ts  # Logging & execution interceptor
│   │   ├── creed-exception.filter.ts # Structured error filter
│   │   └── server-health.ts      # NitroStack Health check provider
│   ├── app.module.ts             # Root NitroStack McpApp Module
│   └── index.ts                  # Server entry bootstrap
├── package.json
└── tsconfig.json
```

---

## 4. Step-by-Step Implementation Breakdown

### Step 1: Centralized Thresholds Config
* **File**: [thresholds.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/config/thresholds.ts)
* **Purpose**: Single source of truth for credit benchmarks, DTI qualified caps, causal model coefficients, reserves requirements, and fraud thresholds.

```typescript
export const CREDIT_SCORE = { FLOOR: 300, PRIME: 660, SUPER_PRIME: 740, CEILING: 850 } as const;
export const DTI = { EXCELLENT: 0.36, QUALIFIED_MAX: 0.43 } as const;
export const INCOME = { MINIMUM: 40_000, STRONG: 60_000 } as const;
export const CREDIT_HISTORY = { MINIMUM_YEARS: 2, ESTABLISHED: 5 } as const;
export const SAVINGS = { MIN_RESERVE_MONTHS: 3 } as const;
export const APPROVAL_THRESHOLD = 0.65;
```

---

### Step 2: Oracle Underwriting Scoring Engine
* **Files**: [oracle.service.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/oracle/oracle.service.ts), [oracle.tools.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/oracle/oracle.tools.ts)
* **Key Features**:
  - Uses continuous piecewise-linear interpolation (`interpolate`) to eliminate artificial score cliffs.
  - Normalizes DTI inputs automatically (handles both `0.48` and `48` formats).
  - Explicit input validation with risk factor reporting for zero income, extreme DTI (>60%), and low reserves.
  - Exposes `@Tool evaluate_applicant` and `@Tool simulate_intervention`.

---

### Step 3: Causal Recourse Path Engine
* **Files**: [causal.service.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/causal/causal.service.ts), [causal.tools.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/causal/causal.tools.ts)
* **Key Features**:
  - Computes individualized recourse from actual profile metrics across 6 path types:
    * `PATH-A-DEBT`: Targeted Debt Paydown (Provides incremental DTI relief of ~0.5-1.0%)
    * `PATH-B-SKILL`: Professional Certification & Income Boost (Highest Standalone Impact — income expansion is the primary driver that slashes DTI from 49.0% down to 43.8%)
    * `PATH-C-SAVE`: Reserve & Savings Building (filtered if < 5pts gain)
    * `PATH-D-COMBINED`: Recommended Full Approval Strategy (Income Expansion + Debt Paydown comfortably crosses the 65% approval threshold)
    * `PATH-E-COSIGNER`: Verified Co-Signer Addition ($0 cost)
    * `PATH-F-INCOME`: Salary Negotiation / Side Income ($0 cost)
    * `ADVISORY-HISTORY`: Immutable Credit History Aging timeline
  - Mathematical Precision: Explicitly distinguishes between primary DTI drivers (income boost) and incremental DTI relief (debt paydown) to ensure 100% alignment with actual lending calculations.
  - Structured return status: `ALREADY_APPROVED`, `PATHS_FOUND`, `NO_PATHS_WITHIN_CONSTRAINTS`.

---

### Step 4: Fraud Safety & Vector Detection
* **Files**: [fraud.service.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/fraud/fraud.service.ts), [fraud.guard.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/fraud/fraud.guard.ts), [fraud.tools.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/fraud/fraud.tools.ts)
* **Key Features**:
  - Detects 4 industry vectors: `TRADELINE_RENTING`, `LOAN_STACKING`, `DEBT_PARKING`, `UNVERIFIED_INCOME_INFLATION`.
  - `evaluateAllViolations()` collects **all** detected risk vectors in a path.
  - `@UseGuards(FraudSafetyGuard)` intercepts incoming action paths before tool handlers run.

---

### Step 5: Legal ECOA Adverse Action Disclosure
* **File**: [legal.tools.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/legal/legal.tools.ts)
* **Key Features**:
  - Mapsdenials to Regulation B legal reason codes:
    * `ECOA-01`: Excessive DTI (>43% QM Cap)
    * `ECOA-04`: Score Below Prime (<660 FICO)
    * `ECOA-07`: Insufficient Verified Income (<$40,000)
    * `ECOA-09`: Limited Credit History (<2 Years)
    * `ECOA-12`: Insufficient Liquid Reserves (<3 Months of Debt)

---

### Step 6: Root Application & Health Checks
* **Files**: [app.module.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/app.module.ts), [server-health.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/common/server-health.ts), [index.ts](file:///c:/Users/Gajula%20Eshwarnath/Desktop/Nitro/creed-lite/src/index.ts)
* **Key Features**:
  - `@McpApp` bootstraps the server over `STDIO` transport for NitroStudio.
  - `@HealthCheck` registers server operational status.

---

## 5. Running & Testing in NitroStudio

### Step-by-Step Verification

1. **Launch Server**:
   ```bash
   npm run dev
   ```
2. **Open NitroStudio**:
   - Ensure the server status shows **Connected (STDIO)** in the top-left corner.

3. **Test via Tools Tab**:
   - Select `evaluate_applicant`
   - Provide JSON:
     ```json
     {
       "creditScore": 610,
       "dtiRatio": 49,
       "annualIncome": 42000,
       "liquidSavings": 1500,
       "creditHistoryYears": 3,
       "monthlyDebtPayment": 1715
     }
     ```
   - Click **Execute** → Returns probability `59.0%` (`REJECTED`).

---

## 6. Testing Prompts & Visual UI Widgets

### Master AI Chat Prompt

Copy and paste this into NitroStudio **AI Chat**:

```text
I applied for a loan and was rejected. Here are my details:
- Credit Score: 610
- DTI Ratio: 49%
- Annual Income: $42,000
- Liquid Savings: $1,500
- Credit History: 3 years
- Monthly Debt Payment: $1,715
- Recourse Budget: $800

Please analyze my application:
1. Evaluate my profile with the underwriting engine to see my approval probability.
2. Get the legal ECOA Regulation B adverse action reason codes for my rejection.
3. Find all dynamic, fraud-checked recourse paths within my $800 budget.
4. Simulate what happens to my approval probability if I follow the highest-confidence recourse path.
```

---

## 7. Troubleshooting & FAQs

### Q1: Why does AI Chat response take 8–10 seconds?
**Answer**: Your backend Node.js code executes in **< 5 milliseconds**. The wait time is due to the cloud AI model making multiple sequential API roundtrips over the internet.

### Q2: What model should I select in NitroStudio?
**Answer**: Select **Claude Sonnet** or **Claude 3.5 Sonnet** in the bottom model picker for fast, reliable tool calling.

### Q3: How do I verify TypeScript compilation?
**Answer**: Run `npx tsc --noEmit`. It must complete with **0 errors**.
