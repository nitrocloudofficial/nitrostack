# 🛡️ IT Access Resolver — Autonomous Enterprise MCP Server & Self-Service Portal

> **An advanced, event-driven IT identity, software license, and network access resolution platform built on the [NitroStack MCP Framework](https://nitrostack.ai).**

---

## 🎯 The Problem Statement

In modern enterprise environments, IT support teams are overwhelmed by L1 helpdesk tickets related to SaaS access failures, software license exhaustion, account lockouts, and remote networking blockers. When an employee attempts to access mission-critical tools like **Figma**, **Slack**, or secure **Shared Drives** and experiences a failure, the bottleneck is often buried across isolated identity and security silos:

1. **Active Directory / Group Memberships**: The user has an active corporate identity but lacks the specific directory security group required by Single Sign-On (SSO) to access the application.
2. **License Seat Exhaustion**: The application pool has reached its strict seat quota (e.g., 20/20 seats in use), blocking provisioning even when group memberships are valid.
3. **Wasted License Expenditure**: Suspended, departed, or pending employees continue occupying premium SaaS seats without an automated compliance reclamation engine to free them up.
4. **Network & Zero-Trust Endpoint Failures**: The user is attempting access from an untrusted personal endpoint or experienced an expired VPN handshake, appearing to the application as an authentication failure.
5. **Slow Resolution Times & Manual Triage**: Traditional helpdesk operators must manually correlate logs across Azure AD, Okta, licensing consoles, and networking gateways, causing delays, high support operational costs, and lost employee productivity.

---

## 💡 The Solution

The **IT Access Resolver** converts complex, manual Level-1 IT diagnostic workflows into an **autonomous, self-healing orchestration engine** using the **Model Context Protocol (MCP)** and **NitroStack Studio**. 

By bridging advanced Large Language Models (LLMs) with granular identity actions, real-time event compliance logging, interactive micro-frontends (Widgets), and algorithmic decision trees, the system enables:
- **Autonomous Multi-Tier Diagnostics**: Instantaneous end-to-end health verification across user identities, AD groups, software license quotas, and VPN encryption states in a single atomic step.
- **Automated Self-Healing Remediation**: One-click or zero-touch auto-resolution that provisions group memberships, requests license expansions, and resets network handshakes automatically without manual human intervention.
- **Zero-Credit Employee Self-Service UI**: Interactive client widgets allowing employees to submit tickets and view diagnosis steppers directly within the chat interface—utilizing direct tool calls (`callTool`) that cost **$0 in LLM computation or Compose credits**.
- **SOC-2 Compliance & Audit Governance**: Built-in rate limiting, caching, and immutable event-driven audit tracking that records every automated action alongside simulated employee Slack notifications.

---

## 🏗️ Architecture & Core System Overview

The application is structured into modular domain layers powered by Dependency Injection (DI) and NestJS-style lifecycle events:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NITROSTACK STUDIO / AI CLIENT                         │
├──────────────────┬──────────────────────┬──────────────────┬────────────────┤
│    Tools Tab     │     Resources Tab    │   Prompts Tab    │  Widgets View  │
│ (Tool Execution) │ (ReadOnly JSON Data) │  (SOP Workflows) │  (React SDK)   │
└────────┬─────────┴──────────┬───────────┴────────┬─────────┴───────┬────────┘
         │                    │                    │                 │
         ▼                    ▼                    ▼                 ▼
┌──────────────────┬──────────────────────┬──────────────────┬────────────────┤
│   @Tool Engine   │   @Resource Engine   │  @Prompt Engine  │ @Widget Hooks  │
│ (ticket.tools.ts)│ (access.resources.ts)│(access.prompts)  │ (Next.js Apps) │
└────────┬─────────┴──────────┬───────────┴────────┬─────────┴───────┬────────┘
         │                    │                    │                 │
         ├────────────────────┴───────────┬────────┴─────────────────┤
         ▼                                ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       GOVERNANCE & RESOLVER ENGINE                          │
│     • @RateLimit (Throttling)        • @Cache (In-Memory Output TTL)        │
│     • AccessTools (Granular AD/VPN/License Actions)                         │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │  emitEvent('ticket.*')
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SOC-2 COMPLIANCE AUDIT MODULE (Phase 2)                   │
│     • AuditService (@OnEvent Subscribers)                                    │
│     • Immutable Log Store (AUD-xxx) + Simulated Slack/Email Notifications   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ What Was Implemented (Full Feature Breakdown)

### 1️⃣ Core Diagnostic & Remediation Backend (`AccessModule`)
* **Simulated Enterprise Datastore** (`fixtures/`): Pre-loaded JSON databases for active/suspended/pending employee identities, corporate AD security group memberships, tool licensing quotas, and network trust handshakes.
* **Low-Level Identity & Access Tools (`AccessTools`)**:
  * `check_identity_status`: Evaluates employee status and AD group enrollments.
  * `check_group_membership`: Verifies if a user holds the mandatory security group required for an application.
  * `check_license_availability`: Calculates real-time total vs. utilized seat counts.
  * `check_network_status`: Inspects endpoint trust tokens and VPN connectivity handshakes.
  * `diagnose_root_cause`: Synthesizes outputs from all four checkpoints to deduce the precise blocker (`not_in_group`, `no_license`, `network_issue`, `account_suspended`, or `unknown`).
* **Automated Remediation Executors**:
  * `add_to_group` / `remove_from_group`: Grants or revokes security memberships.
  * `request_license`: Automatically allocates additional software seats when quotas saturate.
  * `reset_network_access`: Issues automated VPN tunnel resets and device re-verifications.

### 2️⃣ Intelligent Ticket Orchestration Engine (`TicketTools`)
* **Stateful Ticket Management**: Manages support tickets through a formalized lifecycle (`open` → `diagnosing` → `resolved` | `escalated`).
* **`ticket_create_ticket`**: Raises new user support issues and syncs directly with live interactive dashboards.
* **`ticket_run_full_diagnosis`**: Orchestrates a complete health check across all identity tiers, saving granular pass/fail diagnostic states directly onto the ticket and returning data formatted for interactive visual steppers.
* **`ticket_apply_fix`**: Evaluates the diagnosed root cause and autonomously executes the corresponding low-level remediation function. If the root cause cannot be automated (e.g., an unverified pending onboarding account), the system automatically transitions the ticket to an escalated status with detailed reasoning for human admin intervention.

### 3️⃣ Enterprise Governance & Protection (Phase 3)
To secure backend identity providers and budget pools against infinite automation loops and API slamming:
* **Throttling (`@RateLimit`)**:
  * `ticket_create_ticket` is capped at **10 requests per minute**.
  * `ticket_apply_fix` is throttled to a maximum of **5 resolution attempts per minute**, preventing duplicate group provisioning or runaway software license seat purchasing!
* **High-Performance Caching (`@Cache`)**:
  * `ticket_get_all_tickets` applies a **15-second TTL in-memory cache**, eliminating redundant processing during rapid frontend widget polling or chat re-renders.

### 4️⃣ SOC-2 Compliance Audit Engine (`AuditModule` — Phase 2)
Every automated operation executed by the system is monitored by an decoupled compliance engine:
* **Event-Driven Architecture**: Uses NitroStack's native asynchronous eventing (`emitEvent`). When tools create tickets, complete diagnoses, apply automated resolutions, or execute admin escalations, lifecycle domain events (`ticket.created`, `ticket.diagnosed`, `ticket.resolved`, `ticket.escalated`) are immediately fired.
* **Immutable Compliance Store (`AuditService`)**: Subscribes to events via `@OnEvent('ticket.*')` and constructs sequential SOC-2 audit records (`AUD-001`, `AUD-002`), detailing automated flags, timestamps, root causes, and corrective actions taken.
* **Simulated Employee Notifications**: Automatically generates conversational notifications mimicking real-time corporate Slack or automated helpdesk emails (e.g., *"Hi E103, your access issue on TKT-005 has been resolved. Added employee E103 to group 'design-all'."*).
* **MCP Resource Exposure (`AuditResources`)**: Exposes read-only compliance inspection feeds via standard MCP resource URIs:
  * `audit://history`: Complete chronological log of all historical system operations.
  * `audit://recent`: Top 10 newest automated events for real-time dashboard monitoring.
  * `tickets://all` & `tickets://{ticketId}`: Real-time serialization of current support tickets.

### 5️⃣ Standard Operating Procedure (SOP) Prompts (`AccessPrompts` — Phase 1)
Pre-packaged operational instructions in NitroStack Studio's **Prompts tab** that standardize how LLMs and support analysts resolve complex infrastructure challenges:
* **`access_triage_open_tickets`**: An autonomous triage automation loop. Guides the AI agent to retrieve the full backlog, filter open items, perform sequential multi-tier diagnostic scans on each issue, format an executive summary markdown table of findings, and fire automated remediation fixes on all resolveable tickets in one smooth workflow.
* **`access_onboard_employee_access`**: Parameterized new-hire onboarding SOP. Accepts an `employeeId` and comma-separated `toolsNeeded` (e.g., `"Slack,Figma"`), verifying HR identity status and device trust before systematically provisioning active security groups and assigning software licenses.
* **`access_audit_license_usage`**: Automated financial waste audit scan. Cross-references active employee directories against license consumption tables to identify suspended or inactive workers occupying paid seats, generating a cost-savings reclamation table and recommended seat revokations.

### 6️⃣ Interactive Micro-Frontend Widgets (Phase 4)
Powered by Next.js and `@nitrostack/widgets`, these visual UI components transform plain JSON text outputs into stunning, rich interfaces inside NitroStack Studio:
* **IT Ticket Dashboard (`/ticket-dashboard`)**:
  * Responsive, dark-mode visual board organizing tickets into interactive status tabs (**Open**, **Diagnosing**, **Resolved**, **Escalated**).
  * Expandable detail cards rendering diagnostic root-cause icon badges, failure step summaries, and action buttons (**Diagnose**, **Apply Fix**, or **Escalate**).
  * Clicking an action button utilizes `sendFollowUpMessage()` to dispatch an executive prompt directly into the AI conversational agent to complete the workflow!
* **Zero-Credit Employee Self-Service Modal**:
  * Integrated **＋ New Ticket** modal dialog allowing end-users to input an employee ID and failure description directly inside the rendered dashboard.
  * Uses the client React hook `callTool('ticket_create_ticket', ...)` to interact with the backend server via STDIO/HTTP—**creating real tickets, writing audit logs, and updating the visual board instantaneously without consuming zero LLM tokens or Compose credits!**
* **Diagnostic Stepper Widget (`/ticket-diagnosis`)**:
  * Rendered whenever a deep diagnosis is performed (`ticket_run_full_diagnosis`). Displays a step-by-step verification scorecard across the 4 identity security checkpoints, isolating exact system failure points and offering intelligent remedial next steps.
* **Display Mode Controls**: Includes built-in fullscreen toggling (`requestFullscreen` / `requestInline`) for expansive visual review during large-scale Incident Command System (ICS) responses.

---

## 🚀 Getting Started & Testing Guide

### 1. Installation & Start
Ensure all Node dependencies are installed and compile the project:
```powershell
npm install
npm run build
npm run dev
```

### 2. Testing via NitroStack Studio (Zero Credits Path 🟢)
Connect to your running server instance using **[NitroStack Studio](https://nitrostack.ai/studio)**:

1. **Verify Resources (Free)**:
   * Navigate to the **Resources** tab and open `tickets://all` or `audit://recent`.
   * Observe clean, real-time formatted JSON arrays reflecting your system state without spending AI credits.
2. **Execute Tools & Render Widgets (Free)**:
   * Open the **Tools** tab and execute `ticket_create_ticket` with sample parameters (e.g., `employeeId: "E104"`, `issueText: "Cannot access Figma workspace"`).
   * Notice Studio bypasses plain text output to launch the fully interactive **Ticket Dashboard Widget**!
3. **Test Zero-Credit In-Widget Ticket Creation**:
   * Click **＋ New Ticket** directly within the rendered widget header in Studio.
   * Fill out the pop-up modal and submit. Watch your new ticket instantaneously merge into the interactive board via direct SDK tool communication—costing $0 in compute!
4. **Verify SOC-2 Compliance Tracking**:
   * Switch back to the **Resources** tab and re-inspect `audit://recent`. Notice a newly minted `AUD-xxx` audit trail record detailing your creation event alongside a generated employee notification string!
5. **Verify Rate-Limit Governance**:
   * Attempt to execute `ticket_apply_fix` more than 5 times within a 60-second window. Observe the core protection interceptor block the redundant calls with an automated rate-limit exception!

### 3. Testing Autonomous AI Operations via Chat 🤖
1. Navigate to the **Prompts** tab in Studio and select **`access_triage_open_tickets`**.
2. Submit the loaded instructions to the AI Chat.
3. Watch the autonomous agent ingest your entire ticket backlog, run diagnostic stepper scans across all un-diagnosed employee issues, formulate an executive analysis table, and fire auto-remediation calls (`apply_fix`) to permanently resolve your IT access bottlenecks in seconds!

---

## 📁 Repository Structure

```
it-access-resolver/
├── fixtures/                  # Simulated Enterprise Datastore (JSON)
│   ├── identities.json        # Employee records, departments, and AD group enrollments
│   ├── licenses.json          # Software application seat quotas and group prerequisites
│   ├── network.json           # VPN connection timestamps and device trust tokens
│   └── tickets.json           # Sample unresolved employee support cases
├── src/
│   ├── app.module.ts          # Root NitroStack application module binding feature modules
│   ├── modules/
│   │   ├── access/            # IT Identity, Network & Ticket Orchestration Module
│   │   │   ├── access.module.ts
│   │   │   ├── access.types.ts
│   │   │   ├── access.tools.ts      # Low-level directory, license, & network operations
│   │   │   ├── access.resources.ts  # Read-only MCP resources (tickets://all)
│   │   │   ├── access.prompts.ts    # SOP AI instructions (triage, onboarding, audit)
│   │   │   ├── ticket.types.ts      # Support ticketing domain interfaces
│   │   │   └── ticket.tools.ts      # Orchestration tools, caching, & rate limiting
│   │   ├── audit/             # SOC-2 Compliance Audit Engine (Phase 2)
│   │   │   ├── audit.module.ts
│   │   │   ├── audit.types.ts
│   │   │   ├── audit.service.ts     # @OnEvent lifecycle subscriber & notification generator
│   │   │   └── audit.resources.ts   # Read-only audit trail resources (audit://history)
│   │   └── calculator/        # Example starter demonstration module
│   └── widgets/               # Next.js Micro-Frontend Interactive Client Widgets
│       ├── widget-manifest.json     # Declarative UI registration bindings
│       └── app/
│           ├── global-error.tsx     # Graceful error boundaries for static builds
│           ├── ticket-dashboard/    # Interactive Ticket Board + New Ticket Zero-Credit Modal
│           └── ticket-diagnosis/    # Step-by-Step Diagnostic Scorecard Stepper
└── README.md                  # Detailed Architecture & Project Documentation
```
