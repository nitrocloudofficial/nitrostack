# 🎯 Subscription Sniper — A Subscription Auditor

> **Team Name:** Team Six-Sevem  
> **Hackathon Track:** Open Innovation / Enterprise Productivity  
> **Platform:** Built with [Nitrostack](https://github.com/nitrocloudofficial/nitrostack)

---

## 💡 What It Does

**Subscription Sniper** is an autonomous AI Agent built on the Model Context Protocol (MCP) that audits email inboxes for hidden software recurring charges, forgotten free trials, and redundant subscriptions. 

Instead of relying on invasive browser extensions or risky device telemetry tracking, SaaS Sniper uses **Semantic Inferred Usage**. It analyzes incoming billing emails alongside engagement patterns (like newsletters or login alerts) over a 30-day window to calculate software waste and flag dormant subscriptions. It also alerts users 48 hours before an upcoming payment mandate and provides step-by-step text guides to manually cancel auto-pay mandates in payment apps (PhonePe, Google Pay, Paytm).

---

## 🛠️ MCP Architecture & Primitives

This project fully leverages the three core MCP primitives provided by the **Nitrostack SDK**:

### 1. 🔧 Tools
* `fetch_billing_emails(max_results)`: Securely filters and fetches transaction/billing email headers from Gmail or local mock fixtures.
* `extract_subscription_metadata(email_body)`: Parses unformatted email text into structured JSON containing Vendor Name, Cost, Currency, and Renewal Date.
* `calculate_renewal_countdown()`: Scans tracking records to identify subscriptions renewing within 48 hours.
* `check_engagement_signals(service_name)`: Inspects inbox activity for non-billing emails (newsletters/alerts) to deduce whether an account is actively used or dormant.
* `generate_cancellation_playbook(service_name, provider_type)`: Generates step-by-step text guides to manually disable auto-debit mandates in UPI apps.

### 2. 📊 Resources
* `subscriptions://active_inventory`: Real-time JSON matrix representing all discovered ongoing subscriptions.
* `subscriptions://upcoming_renewals`: Context window containing items scheduled for billing within the next 48 hours alongside cancellation playbooks.

### 3. 🎯 Prompts
* `prompts://audit-strategist`: Context configuration guiding the model to act as a corporate CFO to optimize software overhead and calculate ROI metrics.
* `prompts://proactive-notifier`: Generates tailored alerts and recommendations based on inferred usage trends.

---

## 📁 Repository Structure

```text
sample-apps/subscription-sniper/
├── src/
│   ├── index.ts               # Main Nitrostack MCP Server entry point
│   ├── tools/                 # Execution tool handlers
│   ├── resources/             # Active inventory and renewal context resources
│   └── prompts/               # CFO and proactive notification prompt templates
├── data/
│   └── mock_emails.json       # Fallback synthetic email dataset
├── package.json
├── tsconfig.json
└── README.md