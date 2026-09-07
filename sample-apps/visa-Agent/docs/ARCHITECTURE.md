# Visa Agent Architecture

## 1. Project Overview

Visa Agent is an enterprise AI platform for relocation companies. It gives clients and operations teams a controlled way to assess requirements, collect evidence, manage visa cases, coordinate brokers, and prepare submissions through an MCP-powered workflow.

The NitroStack MCP Server is the orchestration layer. It exposes governed capabilities to AI clients, portals, and widgets while preserving clear business boundaries, identity controls, human approvals, and a complete audit trail. Visa Agent is a case-management platform with AI assistance, not an autonomous visa-submission system.

This document is the architectural source of truth for future implementations. New code, MCP capabilities, user interfaces, workflows, integrations, and operational controls must conform to the principles and boundaries described here.

## 2. Vision

Visa Agent enables a relocation organization to deliver a consistent, transparent, and compliant visa experience at enterprise scale.

The target experience is:

- Clients understand their case status, requirements, requested evidence, and next actions without exposing internal operational notes.
- Operations teams receive structured case intelligence, document extraction results, policy context, exception signals, and clear approval queues.
- Brokers receive only the information required to act on an approved assignment.
- AI accelerates research, triage, extraction, summarization, and task coordination, while people retain authority over consequential decisions.
- Every meaningful state change is attributable, auditable, and recoverable.

## 3. Problem Statement Summary

Relocation visa work is high-volume, document-heavy, policy-sensitive, and dependent on many handoffs. Requirements vary by nationality, destination, residence, purpose, and personal circumstances. Policy updates can arrive faster than operational playbooks are revised. Important information is often fragmented across email, shared drives, case systems, and external broker communication.

Visa Agent addresses these problems by combining a governed case record, current policy knowledge, document intelligence, workflow automation, and purpose-built MCP capabilities. The platform must reduce operational effort without presenting uncertain guidance as fact or allowing an AI agent to make decisions reserved for authorized people.

## 4. High-Level Architecture

Visa Agent uses a modular, event-driven architecture.

```text
Client Portal / Operations Portal / MCP AI Client
                    |
                    v
          NitroStack MCP Server
     Tools | Resources | Prompts | Widgets
                    |
     +--------------+---------------+----------------+
     |              |               |                |
     v              v               v                v
Case and Task   Policy Knowledge  Document Intake  Identity and
Orchestration       Service        and OCR Service Authorization
     |              |               |                |
     v              v               v                v
MongoDB         Qdrant +          Document store   OAuth 2.1 and
cases, tasks,   Firecrawl policy  and extraction   role/scope guards
brokers, logs   updates           results
     |
     v
Nitro Events -> n8n -> Email and WhatsApp notifications
```

### Core Platform Responsibilities

- **NitroStack MCP Server:** Orchestrates AI-facing contracts, validates requests, enforces authorization, coordinates domain services, and emits domain events.
- **MongoDB:** The system of record for visa cases, applicant and dependent data, document metadata, broker assignments, tasks, approval decisions, and audit logs.
- **Qdrant:** The retrieval layer for curated visa knowledge, policy fragments, source provenance, jurisdiction metadata, and freshness signals.
- **Firecrawl:** Collects and refreshes approved public policy sources. Its output is ingested, reviewed, attributed, and indexed before it is relied on by case workflows.
- **OCR Service:** Extracts text and structured fields from submitted documents. Extraction results are provisional until reviewed and accepted by an authorized person.
- **Nitro Events:** Publishes small, durable domain-event payloads after state transitions.
- **n8n:** Receives approved integration events and delivers email and WhatsApp notifications. It does not own visa case state or approval policy.

### Architectural Boundaries

- Portals and widgets are presentation layers; they never become the source of truth for case state.
- MCP controllers expose contracts and shape responses; business rules stay in domain services.
- Services access external systems behind explicit adapters and never expose provider-specific payloads directly to users.
- MongoDB owns operational truth. Qdrant supports retrieval and reasoning but does not decide case state.
- Events notify downstream systems after a committed change; events do not replace synchronous validation or required approvals.
- Human approval gates cannot be bypassed by prompts, widgets, tasks, events, or automation.

## 5. Folder Responsibilities

The codebase will migrate toward clear feature ownership. Each folder has one primary responsibility.

| Folder | Responsibility |
| --- | --- |
| `src/config/` | Validated environment configuration, integration settings, and server configuration. |
| `src/guards/` | Authentication, scope, role, tenant, and approval-state enforcement. |
| `src/health/` | Platform and dependency health checks. |
| `src/modules/` | Feature modules containing MCP contracts and domain-facing providers. |
| `src/services/` | Reusable infrastructure and cross-module integrations with clear ownership. |
| `src/events/` | Event contracts, publishers, and subscribers. |
| `src/shared/` | Small, dependency-light shared types, schemas, errors, and utilities. |
| `src/widgets/` | Portal and MCP widget routes, presentation components, and widget manifest. |
| `src/workflows/` | n8n integration contracts, notification mappings, and workflow-facing payload definitions. |
| `src/tests/` | Contract, service, integration, and end-to-end tests organized by feature. |

No folder may become a catch-all. A capability belongs in a feature module when it has a stable business boundary; it belongs in a shared service only when more than one module genuinely depends on it.

## 6. Module Responsibilities

Modules compose related providers through NitroStack dependency injection. A module owns one business capability, its MCP interface, and its domain-facing services. The root module is composition-only: it imports feature modules and platform modules but contains no business workflow logic.

### Case Module

Owns the visa case lifecycle, case participants, current status, eligibility intake, milestones, operational notes, and case-level approvals. It is the authoritative entry point for state transitions.

### Client Module

Owns client-facing views of case information, requests for information, consent, communication preferences, and client-safe status summaries. It must never expose internal operations notes, broker-sensitive information, or another tenant's data.

### Operations Module

Owns operations queues, workload views, exception triage, internal case review, controlled status changes, and approval worklists. It provides the Operations Portal's governed capabilities.

### Document Module

Owns document requests, uploads, metadata, OCR extraction results, validation findings, review decisions, document acceptance, and retention metadata. It does not treat OCR output as verified evidence.

### Policy Knowledge Module

Owns retrieval of visa policy knowledge from Qdrant, source attribution, freshness assessment, jurisdiction filters, and policy-review workflows. It orchestrates Firecrawl-derived updates but does not make legal determinations.

### Broker Module

Owns broker profiles, approved assignments, handoff packets, assignment status, and broker response tracking. An assignment may only be created after a required human approval decision is recorded.

### Task Module

Owns actionable work items, due dates, ownership, dependencies, escalation state, and completion evidence. Tasks link to cases but are independently queryable by authorized users.

### Approval Module

Owns approval requests, decisions, approver identity, decision rationale, timestamps, expiry, and immutable decision history. It is the policy enforcement point for broker assignment, document acceptance, and final submission.

### Notification Module

Owns notification intent, recipient authorization, template selection, delivery status, and n8n handoff. It emits notification requests only from approved events and never mutates case state based solely on delivery outcomes.

### Audit and Observability Module

Owns append-only audit records, correlation IDs, operational metrics, error classification, and dependency telemetry. It must be available to every high-risk module without becoming a business-rule owner.

## 7. Service Responsibilities

Services are injectable, testable units that contain domain logic or isolate an external system. They do not own MCP decorators, widget behavior, or conversational wording.

### Case Service

Creates and retrieves cases, applies allowed lifecycle transitions, records participants, enforces tenant boundaries, and coordinates case-level transaction boundaries. Every mutation receives the actor identity and correlation ID.

### Document Service

Validates document metadata, stores document references, initiates OCR, persists extraction outcomes, tracks review state, and verifies that a document can only be accepted after authorized human approval. Raw document contents must not be written to logs or broad event payloads.

### OCR Service

Sends eligible documents to the OCR provider, normalizes extraction output, records extraction confidence and provenance, and returns a reviewable result. It must distinguish missing, ambiguous, extracted, and human-verified values.

### Policy Service

Queries Qdrant using jurisdiction and case context, filters results by source quality and freshness, and returns concise, attributed policy evidence. It must surface uncertainty and stale-source warnings instead of fabricating completeness.

### Policy Ingestion Service

Coordinates Firecrawl source collection, parsing, source validation, review routing, Qdrant indexing, and freshness metadata. New or materially changed policy content must follow an operational review policy before it influences production guidance.

### Broker Service

Maintains broker profiles and eligibility, prepares minimum-necessary handoff data, and creates assignments only after the Approval Service grants the relevant approval. It never assigns a broker based on AI inference alone.

### Task Service

Creates, assigns, prioritizes, escalates, and closes tasks with evidence. It derives operational tasks from case changes but must remain idempotent when events are replayed.

### Approval Service

Creates approval requests, validates approver authority, records decisions, prevents duplicate or expired decisions from authorizing action, and exposes the approval state required by guarded tools. Its decision records are immutable; corrections are new decisions that supersede prior ones.

### Notification Service

Transforms internal notification intents into n8n-compatible payloads, applies recipient consent and channel rules, records delivery attempts, and handles provider failures without concealing them. It may request a retry but cannot advance a case.

### Audit Service

Writes append-only audit events for sensitive reads, all mutations, approvals, external handoffs, and authorization failures. An audit record includes actor, tenant, action, entity references, result, correlation ID, and timestamp; it excludes secrets and document payloads.

### Integration Adapter Services

MongoDB, Qdrant, Firecrawl, OCR, n8n, and notification-channel adapters each own connection handling, timeouts, retries, provider error normalization, and health reporting. Provider-specific semantics stop at the adapter boundary.

## 8. MCP Philosophy

MCP is Visa Agent's governed capability layer. It gives AI clients a narrow, explicit way to read case context, obtain policy evidence, create work requests, and drive approved workflows. It is not an unrestricted interface to the database or a substitute for operational controls.

The capability model is deliberate:

- **Tools** perform bounded, authorized reads or actions.
- **Resources** expose stable, read-oriented reference material and case snapshots.
- **Prompts** provide reusable task guidance with explicit safety and escalation boundaries.
- **Widgets** render structured results and collect visible, user-triggered follow-up intent.

Every MCP capability must specify its tenant boundary, required role or scope, data classification, audit requirements, idempotency behavior, and whether it can create an external side effect. Capabilities that affect case progression must make the human approval requirement visible in both their contract and their response.

## 9. Tool Design Guidelines

Tools represent one clear operation. They use strict Zod input schemas, return structured and widget-ready outputs, and are protected by authentication and authorization guards.

### General Rules

- Use stable `snake_case` names and a domain prefix where it improves clarity, such as `case_create` or `document_request_review`.
- Describe the intended use, preconditions, side effects, and approval requirements in the tool description.
- Accept explicit structured fields, never opaque JSON strings for domain input.
- Validate input before invoking a service and normalize all service output before returning it.
- Include case ID, tenant-safe entity IDs, approval status, correlation ID, and next allowable actions in consequential responses.
- Apply rate limits to expensive retrieval, OCR initiation, and external integrations.
- Cache only non-sensitive, read-only policy retrieval results with a bounded TTL and a tenant-aware key where necessary.
- Require explicit user intent for any mutation. The tool must not infer consent from conversational context alone.
- Make writes idempotent through a client-provided or server-generated idempotency key when duplicate execution could cause harm.
- Record an audit event for sensitive reads and all mutations.

### Tool Categories

| Category | Examples | Requirements |
| --- | --- | --- |
| Case reads | `case_get`, `case_list`, `case_get_timeline` | Tenant filtering, least-privilege fields, audit for sensitive access. |
| Policy reads | `policy_search`, `policy_get_sources` | Jurisdiction inputs, citations, freshness and confidence signals. |
| Document actions | `document_upload`, `document_request_review`, `document_get_extraction` | File validation, malware scanning policy, data minimization, audit trail. |
| Operational actions | `task_create`, `task_assign`, `case_request_approval` | Explicit actor, idempotency, authorization, status validation. |
| Approval actions | `approval_decide` | Authorized role, decision rationale, immutable audit record. |
| Submission actions | `submission_prepare`, `submission_request_approval`, `submission_execute` | Mandatory human approval, final validation, explicit confirmation, external-side-effect audit. |

### Mandatory Approval Gates

No tool may create or simulate a successful outcome for the following actions without an active approval record from the Approval Service:

- Broker assignment.
- Document acceptance.
- Final visa submission.

Tools may create a request, collect evidence, prepare a preview, or report why approval is blocked. They must return a clear `approval_required` state until the authorized decision exists.

## 10. Resource Design Guidelines

Resources provide data that an AI client can read without treating the read as an implicit business action. They should be compact, stable, attributable, and appropriate to the requester's authorization level.

### URI and Data Rules

- Use lowercase, domain-specific URI schemes: `visa://`, `case://`, `policy://`, `document://`, and `task://`.
- Use human-readable resource names and accurate MIME types.
- Distinguish public or enterprise-reference material from protected, case-specific resources.
- Scope dynamic resources by tenant and caller identity before retrieval.
- Include `source_url`, `published_at` when available, `retrieved_at`, `reviewed_at` when applicable, and freshness status for policy resources.
- Never expose raw access tokens, secret configuration, full document binaries, or unnecessary personal data.
- Treat a resource as a read model, not an API for state changes.

### Canonical Resource Families

| Resource | Purpose | Access |
| --- | --- | --- |
| `policy://jurisdiction/{destination}` | Curated, attributed visa policy evidence for a jurisdiction. | Authorized client or operations user. |
| `policy://freshness/{destination}` | Policy-source freshness, review state, and update metadata. | Operations and policy roles. |
| `case://{caseId}/summary` | Client-safe or operations-safe case summary based on caller role. | Case participant or authorized operations user. |
| `case://{caseId}/timeline` | Case milestones, requested actions, and decision history appropriate to the role. | Protected. |
| `document://{documentId}/extraction` | OCR extraction result and review status without raw binary content. | Protected, least privilege. |
| `task://{taskId}` | Task status, owner, due date, and completion evidence. | Protected. |

## 11. Prompt Design Guidelines

Prompts are reusable instruction templates. They guide an AI client through a specific workflow but cannot override authorization, tenant isolation, policy evidence, or approval gates.

### Required Prompt Behavior

- Keep prompts purpose-specific, argument-driven, and short enough to remain maintainable.
- Instruct the AI to cite retrieved policy sources and identify freshness limitations.
- Instruct the AI to separate sourced policy information, OCR extraction, operational recommendation, and user-provided facts.
- Require the AI to ask for missing information only when it is necessary for the next allowed action.
- Tell the AI to avoid legal advice, guarantees of outcome, or unsupported eligibility conclusions.
- Tell the AI to prepare and explain approvals, never silently bypass them.
- Require explicit user confirmation before the AI invokes a mutation-capable tool.
- For sensitive contexts, instruct the AI to minimize reproduction of personal data in conversation.
- Ensure prompts stop after completing the requested task; they must not expand into unrelated case actions.

### Canonical Prompt Families

- **Visa eligibility intake:** Gathers structured travel and applicant context, identifies missing facts, and retrieves relevant policy evidence.
- **Document readiness review:** Summarizes OCR findings, highlights ambiguity, and creates a human-review-ready checklist without accepting any document.
- **Operations case triage:** Prioritizes case risks, overdue tasks, policy freshness concerns, and missing approvals.
- **Broker handoff preparation:** Builds a minimum-necessary handoff preview and requests the required assignment approval.
- **Submission readiness:** Verifies checklist completeness, policy evidence, consent, and approval prerequisites before a human final decision.

## 12. Widget Design Guidelines

Widgets are presentation surfaces for structured MCP results in the Client Portal, Operations Portal, or supported AI clients. A widget may request a follow-up tool call only from a visible, user-triggered interaction and only within the caller's authorization.

### General Rules

- Map every widget route to a declared backend widget identifier and a versioned data contract.
- Use the NitroStack widget SDK for tool output, host state, display modes, and user-triggered follow-up calls.
- Keep widget state limited to presentation choices such as active tab, filters, sorting, and expanded sections.
- Render loading, empty, partial, stale-data, approval-pending, unauthorized, and error states.
- Never place business rules, approval decisions, or hidden mutations in the widget.
- Respect theme, safe areas, maximum height, keyboard navigation, touch targets, and reduced-motion preferences.
- Display source attribution, policy freshness, extraction confidence, and approval status where they affect a user's decision.
- Redact or mask sensitive fields unless the current role explicitly requires them.

### Client Portal Widgets

- Case summary and milestone tracker.
- Document request checklist and secure upload status.
- Document review outcome and requested corrections.
- Client-safe policy and preparation guidance.
- Notification preference and communication history view.

### Operations Portal Widgets

- Case work queue with priority, ownership, and blocked-state signals.
- Document extraction review with source image references and confidence indicators.
- Approval queue for broker assignment, document acceptance, and final submission.
- Policy freshness dashboard with source attribution and review status.
- Broker assignment preview and controlled handoff status.
- Case timeline and immutable audit-event viewer.

## 13. Event Flow

Nitro Events decouple committed domain transitions from secondary processing. Events are emitted only after the source-of-truth change is recorded. Subscribers must be registered providers, idempotent, observable, and safe to retry.

### Event Contract

Each event includes:

- Event name and schema version.
- Event ID and correlation ID.
- Tenant ID and actor identity where applicable.
- Entity type and identifier.
- UTC timestamp.
- Minimal, non-sensitive payload needed by subscribers.

Events never include raw document content, credentials, access tokens, or broad personal profiles.

### Primary Flow

```text
Authorized actor or AI client
  -> MCP tool validates input, role, scope, tenant, and case state
  -> Domain service commits the state change in MongoDB
  -> Audit Service records the action
  -> Nitro Event is emitted
  -> Event subscriber creates or updates internal task/read model
  -> Notification Service sends approved intent to n8n
  -> n8n delivers email or WhatsApp and returns delivery status
  -> Delivery result is recorded without changing the governing approval or case decision
```

### Canonical Events

- `case.created`
- `case.status_changed`
- `case.information_requested`
- `document.uploaded`
- `document.ocr_completed`
- `document.review_requested`
- `document.acceptance_approved`
- `broker.assignment_requested`
- `broker.assignment_approved`
- `broker.assigned`
- `task.created`
- `task.overdue`
- `approval.requested`
- `approval.decided`
- `submission.readiness_completed`
- `submission.approved`
- `submission.executed`
- `policy.source_updated`
- `policy.index_refreshed`

Notification subscribers must be explicitly mapped to events and recipients. They must check tenant, consent, channel eligibility, and message-template policy before invoking n8n.

## 14. Task Flow

Task flow is the controlled sequence connecting portals, MCP capabilities, services, approvals, and notifications. A case cannot advance solely because a task is marked complete; the required domain validation and approval state must also be satisfied.

### Case Lifecycle

```text
Draft
  -> Intake in Progress
  -> Evidence Collection
  -> Operations Review
  -> Broker Assignment Pending Approval
  -> Broker Assigned
  -> Submission Readiness Review
  -> Final Submission Pending Approval
  -> Submitted
  -> Decision Received
  -> Closed
```

Exceptional paths include `On Hold`, `Information Required`, `Escalated`, `Withdrawn`, and `Rejected`. A transition table, maintained by the Case Module, defines which roles and prerequisites can move a case between states.

### Client Flow

1. A client starts or is invited to a case and confirms required consent.
2. The system collects structured applicant, destination, purpose, and timing information.
3. Policy retrieval provides attributed guidance and a tailored evidence checklist.
4. The client uploads requested documents and sees their review status.
5. The client responds to information requests and tracks milestones.
6. The client receives approved notifications through permitted channels.

### Operations Flow

1. An operations user reviews intake completeness, policy freshness, and case risk flags.
2. OCR results are checked against original documents and case requirements.
3. The user requests corrections, creates tasks, or advances the case within their authority.
4. Broker assignment is prepared as a preview and routed for mandatory human approval.
5. After approval, the system creates the assignment and sends the approved handoff.
6. The operations team monitors broker responses, tasks, and outstanding evidence.

### Document Acceptance Flow

1. A document is uploaded and stored with metadata.
2. OCR extraction creates provisional values and confidence markers.
3. An authorized reviewer compares extraction output to the source and requirement.
4. The reviewer requests an approval decision for document acceptance.
5. Only an authorized human decision marks the document as accepted.
6. The decision, reviewer, rationale, and timestamps are stored in the audit trail.

### Final Submission Flow

1. The system prepares a submission-readiness summary without submitting anything.
2. Operations verifies evidence, data quality, consent, policy freshness, and outstanding tasks.
3. The final-submission approval request is created with a stable case snapshot reference.
4. An authorized human explicitly approves or rejects the request.
5. Only after approval may a submission tool invoke an external submission channel.
6. The result is recorded, auditable, and communicated through the approved notification flow.

## 15. Authentication Strategy

Visa Agent uses OAuth 2.1 for user-facing and portal-facing access, with token validation, audience validation, tenant claims, scopes, and role-based authorization enforced at the MCP boundary. Service-to-service integrations use narrowly scoped credentials or API keys managed outside end-user sessions.

### Identity Model

- **Client user:** May access only their own authorized case data and client actions.
- **Operations user:** May access assigned or tenant-authorized operational cases and queues.
- **Approver:** May make approval decisions within delegated authority.
- **Policy reviewer:** May review and publish policy-source updates.
- **Broker:** May access explicitly assigned, minimum-necessary handoff data.
- **Administrator:** Manages tenant configuration, roles, and operational policy; administrative access is separately audited.
- **Service identity:** Used only for integration boundaries such as n8n, Firecrawl, OCR, MongoDB, and Qdrant.

### Scope Model

| Scope | Capability |
| --- | --- |
| `case:read` | Read permitted case summaries, timelines, and work queues. |
| `case:write` | Create or update permitted non-final case data. |
| `document:read` | Read allowed document metadata and review outcomes. |
| `document:write` | Upload documents and create document-review requests. |
| `document:approve` | Decide document acceptance approvals. |
| `broker:assign` | Request or perform an already approved broker assignment. |
| `submission:prepare` | Prepare a submission-readiness package. |
| `submission:approve` | Decide final submission approvals. |
| `submission:execute` | Invoke a final submission only with active approval. |
| `policy:manage` | Review and publish policy knowledge updates. |
| `audit:read` | Read authorized audit records. |

### Security Rules

- Production access fails closed when identity, audience, tenant, scope, or role validation fails.
- Guards run before tool execution; a domain service repeats critical state and tenant checks at the write boundary.
- Tokens, raw documents, OCR payloads, and sensitive personal data are never written to ordinary logs.
- Sensitive reads and all mutations are auditable.
- Consent and communication preferences are checked before notification delivery.
- Secrets are held in environment-managed secret stores and are never returned through MCP resources, prompts, widgets, or errors.
- Authorization is enforced server-side; hiding a widget control is never an authorization mechanism.

## 16. Coding Standards

### Backend Standards

- Use TypeScript and NitroStack's module, dependency-injection, controller, tool, resource, prompt, widget, guard, health, and event mechanisms consistently.
- Keep controllers thin: validate schemas, call services, map results, and return contracts.
- Keep services cohesive and independent of MCP presentation details.
- Define explicit Zod input schemas for every tool and output schemas for consequential responses.
- Use typed domain models and discriminated states for case, document, task, approval, and submission flows.
- Put tenant ID, actor identity, and correlation ID into every protected service operation.
- Normalize provider errors into stable application errors; never leak stack traces, secrets, or provider credentials.
- Use UTC ISO 8601 timestamps and store a clear source for every policy fact.
- Make external writes idempotent, timeout-bounded, and retry-aware.
- Use Nitro Events for secondary effects, not for decisions that must complete atomically with the initiating action.

### Data Standards

- MongoDB collections use explicit ownership, indexes, retention rules, and soft-delete or archival policies where business rules require them.
- Qdrant points include source, jurisdiction, effective-date context, ingestion time, review state, and document version metadata.
- Store documents in an appropriate secure document store; MongoDB retains metadata and references unless a governed exception requires otherwise.
- Encrypt sensitive data in transit and at rest. Minimize stored personally identifiable information and define retention by tenant policy.
- Maintain append-only audit records for approval and submission decisions.

### Quality Standards

- Test domain transitions, authorization boundaries, approval gates, idempotency, event replay behavior, and provider failure handling.
- Mock external adapters at service boundaries.
- Validate tool and widget data contracts with representative safe fixtures.
- Add observability for latency, errors, retries, authorization denials, event delivery, OCR confidence distribution, and policy freshness.
- Treat policy retrieval quality, data protection, and approval enforcement as release-blocking concerns.

## 17. Naming Conventions

### Product and Domain Names

- Product name: **Visa Agent**.
- Server name: `visa-agent-server`.
- Use business terms consistently: `case`, `applicant`, `dependent`, `document`, `policy`, `broker`, `task`, `approval`, `submission`, and `audit`.
- Avoid vague terms such as `data`, `record`, or `process` when a domain term is available.

### Files and Classes

| Artifact | Convention | Example |
| --- | --- | --- |
| Module | `*.module.ts` / `PascalCaseModule` | `case.module.ts` / `CaseModule` |
| Tools | `*.tools.ts` / `PascalCaseTools` | `case.tools.ts` / `CaseTools` |
| Resources | `*.resources.ts` / `PascalCaseResources` | `policy.resources.ts` / `PolicyResources` |
| Prompts | `*.prompts.ts` / `PascalCasePrompts` | `operations.prompts.ts` / `OperationsPrompts` |
| Service | `*.service.ts` / `PascalCaseService` | `approval.service.ts` / `ApprovalService` |
| Guard | `*.guard.ts` / `PascalCaseGuard` | `tenant.guard.ts` / `TenantGuard` |
| Event | `*.event.ts` / `PascalCaseEvent` | `document-uploaded.event.ts` / `DocumentUploadedEvent` |
| Widget route | lowercase kebab-case | `case-timeline` |

### MCP and Event Names

- Tool and prompt names use `snake_case`: `case_get`, `document_request_review`, `submission_prepare`.
- Resource schemes are lowercase: `case://`, `policy://`, `document://`, `task://`.
- Event names are lowercase and dot-separated: `case.status_changed`, `approval.decided`, `submission.executed`.
- MongoDB collection names use lowercase plural nouns: `cases`, `documents`, `brokers`, `tasks`, `audit_logs`.
- Qdrant collection names communicate content and environment: `visa_policy_knowledge_prod`.

## 18. Folder Structure We Will Migrate Toward

```text
src/
  index.ts
  app.module.ts
  config/
    app.config.ts
    auth.config.ts
    integrations.config.ts
  guards/
    oauth.guard.ts
    scope.guard.ts
    role.guard.ts
    tenant.guard.ts
    approval.guard.ts
  health/
    system.health.ts
    dependencies.health.ts
  events/
    event.contracts.ts
    event.handlers.ts
  modules/
    case/
      case.module.ts
      case.tools.ts
      case.resources.ts
      case.prompts.ts
      case.service.ts
      case.schemas.ts
    client/
      client.module.ts
      client.tools.ts
      client.resources.ts
      client.service.ts
    operations/
      operations.module.ts
      operations.tools.ts
      operations.prompts.ts
      operations.service.ts
    documents/
      documents.module.ts
      documents.tools.ts
      documents.resources.ts
      documents.service.ts
      ocr.service.ts
    policy-knowledge/
      policy-knowledge.module.ts
      policy-knowledge.tools.ts
      policy-knowledge.resources.ts
      policy-knowledge.prompts.ts
      policy.service.ts
      policy-ingestion.service.ts
    brokers/
      brokers.module.ts
      brokers.tools.ts
      brokers.service.ts
    tasks/
      tasks.module.ts
      tasks.tools.ts
      tasks.resources.ts
      tasks.service.ts
    approvals/
      approvals.module.ts
      approvals.tools.ts
      approvals.resources.ts
      approval.service.ts
    submissions/
      submissions.module.ts
      submissions.tools.ts
      submissions.prompts.ts
      submission.service.ts
    notifications/
      notifications.module.ts
      notification.service.ts
      n8n.adapter.ts
    observability/
      observability.module.ts
      audit.service.ts
      metrics.service.ts
  services/
    mongodb.service.ts
    qdrant.service.ts
    firecrawl.service.ts
    document-storage.service.ts
  shared/
    errors/
    schemas/
    types/
    utils/
  workflows/
    notification-events.ts
    n8n-payloads.ts
  widgets/
    app/
      client-case-summary/
      document-readiness/
      operations-queue/
      approval-queue/
      policy-freshness/
      case-timeline/
    components/
    lib/
    widget-manifest.json
  tests/
    contract/
    integration/
    services/
    workflows/
```

Migration occurs incrementally. Existing files remain in place until a feature module is introduced with tests, a documented contract, and a safe migration plan. No broad rename or move is justified solely to match this target structure.

## 19. Future Implementation Roadmap

### Phase 1: Platform Foundation

- Align server metadata, environment configuration, and health checks with Visa Agent.
- Establish MongoDB collections, indexes, tenant boundaries, and audit-log retention.
- Introduce OAuth 2.1 validation, scope guards, role guards, and tenant guards.
- Define canonical case, document, task, approval, and event contracts.
- Establish structured logging, correlation IDs, dependency health checks, and error taxonomy.

### Phase 2: Case and Portal Foundation

- Implement the Case, Client, Operations, and Task modules.
- Deliver client-safe case status and operations work-queue read models.
- Add initial Client Portal and Operations Portal widgets with accessible loading, authorization, and error states.
- Implement the case lifecycle transition policy and task-generation rules.

### Phase 3: Document Intelligence and Human Review

- Add secure document intake, metadata handling, malware-scanning policy, and OCR integration.
- Build document-extraction review and evidence-request workflows.
- Enforce human approval before any document is accepted.
- Add document-readiness widgets, audit coverage, and exception handling.

### Phase 4: Policy Knowledge and Retrieval

- Connect Firecrawl to an approved-source ingestion pipeline.
- Add policy review, provenance, freshness, jurisdiction tagging, and Qdrant indexing.
- Deliver policy search resources, cited prompt families, and freshness dashboards.
- Establish operational controls for stale, conflicting, or unreviewed sources.

### Phase 5: Broker and Approval Governance

- Add broker profiles, eligibility, minimum-necessary handoff packages, and assignment tracking.
- Implement broker-assignment approval requests and decision workflow.
- Add the Approval Module across document acceptance and final submission preparation.
- Provide approval queues, delegated authority rules, and immutable audit views.

### Phase 6: Notifications and Workflow Automation

- Define versioned Nitro Event contracts and idempotent handlers.
- Connect approved notification intents to n8n.
- Enable consent-aware email and WhatsApp delivery with retry, failure, and delivery-status tracking.
- Add escalation rules for overdue tasks, missing evidence, expiring approvals, and policy freshness risks.

### Phase 7: Controlled Submission Capability

- Implement submission-readiness validation and a stable readiness snapshot.
- Require explicit final human approval before external submission.
- Add submission execution adapters, result normalization, audit coverage, and recovery workflows.
- Validate governance, legal, privacy, and operational requirements before enabling the capability per tenant or jurisdiction.

### Phase 8: Enterprise Hardening

- Add comprehensive contract, authorization, integration, event-replay, and resilience testing.
- Add operational dashboards, service-level objectives, incident runbooks, and security review evidence.
- Add data-retention automation, privacy request workflows, tenant administration, and controlled rollout mechanisms.
- Review this document with product, operations, security, and legal stakeholders whenever a new high-risk workflow is proposed.
