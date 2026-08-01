# SurgeGuard Production Database Blueprint

**Project:** Care360 Surge Command  
**Product positioning:** SurgeGuard — a policy-gated emergency surge planner  
**Canonical database:** PostgreSQL 16+  
**Scope:** Multi-tenant hospital and health-system operations, policy evaluation, planning, execution, MCP exposure, integration, security, audit and analytics.

## 1. Non-negotiable architecture

1. **The EHR remains the clinical source of truth.** SurgeGuard stores the minimum normalized operational projection needed for planning plus immutable source payloads and provenance links.
2. **Every plan is policy-gated twice:** after generation and immediately before execution. A changed plan hash, stale source snapshot, unresolved hard rule, expired exception or missing approval makes the plan ineligible.
3. **Hard, soft and advisory constraints are distinct.** The optimizer may trade soft objectives, but it cannot silently relax hard staffing, qualification, isolation, licensed-capacity or safety constraints.
4. **Every mutation is tenant-scoped, idempotent, transactionally audited and optimistic-concurrency protected.**
5. **PHI is minimized.** Sensitive identifiers are encrypted outside ordinary query columns; deterministic hashes support matching; MCP and audit payloads are redacted.
6. **Execution is a controlled state transition, not a chat response.** Human authority, separation of duties, evidence, policy status and rollback readiness are persisted.
7. **Integration is failure-tolerant.** Raw-source storage, mappings, sync checkpoints, inbox/outbox, webhook attempts, dead-letter handling and replay controls are first-class.
8. **No policy text is directly trusted as executable logic.** Imported documents, immutable releases, extracted rules, tests, publication approvals and runtime evidence are separate records.

## 2. Deliverable statistics

- 14 domain schemas
- 252 tables
- 3241 table columns
- 24 table-level constraints
- 46 explicit indexes
- 4 operational views
- 7 stored functions
- 18 enums and 4 domains
- 35 MCP tool contracts, 8 resources and 4 prompts

## 3. Schema map and complete table inventory

### `analytics` — Metrics, observations, dashboards, reports, data-quality checks and model monitoring.

- `dashboard_definitions`, `data_quality_results`, `data_quality_rules`, `metric_definitions`, `metric_observations`, `model_monitoring`, `report_definitions`, `report_runs`

### `audit` — Audit events, row changes, data access, exports, disclosures, provenance, security events, legal holds and retention actions.

- `audit_events`, `data_access_events`, `data_exports`, `disclosures`, `legal_holds`, `provenance_records`, `retention_actions`, `row_changes`
- `security_events`

### `capacity` — Locations, beds, licensed/staffed capacity, holds, turnover, surge spaces, devices, inventory, vendors and purchasing.

- `bed_assignments`, `bed_capabilities`, `bed_holds`, `bed_status_events`, `bed_turnovers`, `beds`, `capacity_profiles`, `capacity_windows`
- `device_assignments`, `device_status_events`, `device_types`, `devices`, `environmental_constraints`, `inventory_items`, `inventory_lots`, `inventory_movements`
- `location_capabilities`, `locations`, `par_levels`, `purchase_order_lines`, `purchase_orders`, `surge_space_prerequisites`, `surge_spaces`, `vendors`

### `clinical` — Minimum patient and encounter facts needed for surge planning: acuity, triage, isolation, care requirements, queues, movement, discharge and transfer.

- `acuity_assessments`, `care_requirements`, `diagnoses`, `discharge_readiness`, `encounter_status_history`, `encounters`, `isolation_requirements`, `patient_cohort_members`
- `patient_cohorts`, `patient_flags`, `patient_identifiers`, `patient_movements`, `patients`, `queue_definitions`, `queue_entries`, `transfer_destinations`
- `transfer_requests`, `transport_requests`, `triage_events`

### `comms` — Channels, endpoints, templates, messages, recipients, acknowledgements and escalation.

- `acknowledgements`, `channels`, `escalation_instances`, `escalation_policies`, `escalation_steps`, `message_recipients`, `messages`, `recipient_endpoints`
- `templates`

### `core` — Tenancy, organization hierarchy, facilities, departments, configuration, contacts and retention policy.

- `addresses`, `configurations`, `contacts`, `department_service_lines`, `departments`, `facilities`, `organization_identifiers`, `organization_relationships`
- `organizations`, `retention_policies`, `service_lines`, `tenants`

### `iam` — Users, service identities, OAuth clients, API keys, roles, permissions, scopes, delegations, sessions and break-glass access.

- `api_keys`, `auth_events`, `break_glass_sessions`, `data_scopes`, `delegations`, `oauth_clients`, `permissions`, `principal_scopes`
- `role_permissions`, `roles`, `service_accounts`, `sessions`, `user_identities`, `user_roles`, `users`

### `incident` — Incident command, operational periods, positions, assignments, situation reports, hazards, objectives, tactics, action plans, tasks, resource requests and decisions.

- `action_plan_items`, `action_plans`, `approvals`, `command_assignments`, `command_position_definitions`, `decisions`, `hazards`, `incident_facilities`
- `incident_types`, `incidents`, `objectives`, `operational_periods`, `resource_fulfillments`, `resource_requests`, `safety_measures`, `situation_reports`
- `tactics`, `task_dependencies`, `tasks`, `timeline_events`

### `integration` — Source systems, FHIR/HL7 storage, mappings, imports, subscriptions, events, webhooks, outbox/inbox, dead letters and idempotency.

- `connection_tests`, `dead_letters`, `endpoints`, `external_events`, `fhir_resource_links`, `fhir_resources`, `fhir_subscriptions`, `field_mappings`
- `files`, `hl7_acknowledgements`, `hl7_messages`, `idempotency_keys`, `import_jobs`, `import_records`, `inbox_events`, `mapping_profiles`
- `outbox_events`, `source_systems`, `sync_checkpoints`, `webhook_deliveries`, `webhooks`

### `mcp` — MCP servers, deployments, clients, sessions, tools, resources, prompts, requests, calls, tasks, elicitation, approvals, rate limits and protocol logs.

- `client_sessions`, `clients`, `context_links`, `elicitation_responses`, `elicitations`, `human_approvals`, `prompt_definitions`, `prompt_versions`
- `protocol_logs`, `rate_limit_policies`, `requests`, `resource_definitions`, `resource_subscriptions`, `resource_templates`, `response_cache`, `result_artifacts`
- `server_capabilities`, `server_deployments`, `servers`, `task_runs`, `tool_call_steps`, `tool_calls`, `tool_definitions`, `tool_permissions`
- `tool_versions`, `usage_buckets`

### `planning` — Scenarios, snapshots, forecasts, optimization, candidate plans, allocations, simulations, approvals, execution, deviations and after-action review.

- `after_action_reviews`, `approval_workflow_steps`, `approval_workflows`, `assumptions`, `baseline_snapshots`, `candidate_plans`, `constraint_definitions`, `demand_forecast_points`
- `demand_forecasts`, `demand_observations`, `execution_deviations`, `execution_steps`, `forecast_models`, `objective_definitions`, `optimization_models`, `optimization_runs`
- `plan_actions`, `plan_approvals`, `plan_bed_allocations`, `plan_cohort_routes`, `plan_comparisons`, `plan_device_allocations`, `plan_executions`, `plan_safety_metrics`
- `plan_scores`, `plan_staffing_assignments`, `plan_supply_allocations`, `plan_transfers`, `plan_wait_projections`, `run_constraints`, `run_objectives`, `run_steps`
- `scenario_inputs`, `scenario_versions`, `scenarios`, `sensitivity_analyses`, `simulation_runs`, `simulations`, `solver_profiles`

### `policy` — Source policies, immutable releases, executable rule sets, applicability, dependencies, tests, evaluations, violations, remediation and authorized exceptions.

- `evaluation_sessions`, `evidence_requirements`, `override_authorities`, `override_requests`, `policy_acknowledgements`, `policy_documents`, `policy_rule_set_links`, `policy_sections`
- `policy_versions`, `remediation_actions`, `rule_applicability`, `rule_dependencies`, `rule_evaluations`, `rule_parameter_overrides`, `rule_parameters`, `rule_sets`
- `rule_tests`, `rules`, `violations`

### `terminology` — Code systems, concepts, value sets, mappings and local-code normalization.

- `code_systems`, `concept_map_items`, `concept_maps`, `concepts`, `local_code_mappings`, `local_codes`, `value_set_members`, `value_sets`

### `workforce` — Practitioners, roles, credentials, competencies, privileges, restrictions, availability, shifts, fatigue and staffing pools.

- `agency_contracts`, `availability_windows`, `certifications`, `competency_definitions`, `employments`, `fatigue_events`, `leave_periods`, `licenses`
- `on_call_rosters`, `practitioner_competencies`, `practitioner_identifiers`, `practitioner_privileges`, `practitioner_restrictions`, `practitioner_roles`, `practitioners`, `privilege_definitions`
- `role_capabilities`, `role_definitions`, `shift_assignments`, `shift_requirements`, `shifts`, `staffing_pool_memberships`, `staffing_pools`

## 4. Critical state machines

- **Incident:** planned/monitoring → activated → stabilizing → demobilizing → closed; cancellation remains explicit.
- **Candidate plan:** draft → evaluating → blocked or eligible → pending approval → approved/rejected → executing → completed/cancelled/superseded.
- **Policy violation:** open → acknowledged → remediated, accepted under authorized exception, or dismissed with evidence.
- **Approval:** pending → approved/rejected/cancelled/expired/superseded.
- **Execution:** queued → running → succeeded/partial/failed/cancelled/timed out.
- **Operational task:** draft → ready → in progress/on hold → completed/failed/cancelled.
- **Bed:** available/held/occupied/cleaning/blocked/closed/unknown, with event history and non-overlapping assignments.
- **Shift assignment:** planned → offered → accepted/declined → checked in → completed/no-show/cancelled.

## 5. Database-enforced invariants

- All tenant-owned records carry `tenant_id`; row-level security reads `app.tenant_id` and denies access when it is absent.
- Mutable aggregate roots carry `row_version`; update triggers increment it and refresh `updated_at`.
- Bed assignments use an exclusion constraint to prevent overlapping occupancy intervals for the same bed.
- Time ranges require end after start; capacity tiers cannot decrease from normal to contingency to crisis.
- Candidate plans retain immutable input and plan hashes; approvals bind to the locked plan hash.
- Policy evaluations retain input facts, outputs, evidence, duration and errors per rule.
- Audit and provenance tables reject update and delete operations through append-only triggers.
- Mutating MCP calls retain idempotency keys, input/output hashes, policy evaluation links and human approval links.
- The permission catalog distinguishes PHI access and whether a purpose-of-use is mandatory.

## 6. Policy gate execution order

1. Resolve tenant, facility, department, incident and operational period scope.
2. Verify source freshness and data-quality thresholds.
3. Freeze a baseline snapshot and calculate its content hash.
4. Generate candidate actions without applying them.
5. Evaluate licensing, certifications, competencies, privileges, restrictions, fatigue and labor constraints.
6. Evaluate licensed/staffed/operational capacity, isolation, cohorting, environmental and equipment constraints.
7. Evaluate policy applicability by jurisdiction, facility, department, care level, incident type and effective date.
8. Persist rule-level evidence and violations; mark unresolved hard or critical violations as blocking.
9. Simulate or stress-test eligible candidates and expose trade-offs.
10. Lock the selected plan hash, collect required approvals and validate separation of duties.
11. Immediately before execution, refresh facts and run the pre-execution policy gate again.
12. Execute idempotent steps, observe deviations, re-evaluate affected actions and retain rollback evidence.

## 7. MCP server rules

- Use Streamable HTTP for production; local stdio is limited to controlled administrative development.
- Authorization is resource-server based, audience-bound and tenant-scoped. Public clients use PKCE.
- Every tool has a stable definition and immutable tool release with input/output JSON Schema and a content hash.
- Read tools return freshness, provenance and policy status. Action tools require idempotency keys and explicit authority.
- Forecast, optimization, simulation and synchronization use task records, progress, expiry and cancellation.
- Tool results never contain unredacted credentials, tokens or raw sensitive payloads.
- MCP resources are read projections; they do not bypass tool authorization or purpose-of-use checks.
- Elicitation is permitted for missing business inputs, never for collecting secrets or bypassing approvals.

## 8. Transaction boundaries and concurrency

- Read dashboards use read-only transactions and snapshot-consistent views.
- Baseline capture uses repeatable-read semantics so forecasts and optimization share one fact boundary.
- Approval, exception, bed allocation, staff assignment and execution initiation use serializable transactions or explicit advisory locks.
- All external effects use the transactional outbox. Consumer writes use inbox deduplication and idempotency records.
- An update must include the expected aggregate `row_version`; a mismatch returns `SG_STALE_WRITE`.
- Locks are taken in deterministic order: incident → plan → execution → location/bed → practitioner/shift → inventory.

## 9. Integration model

- Preserve raw FHIR resources and HL7 messages with source identifiers, timestamps and hashes before normalization.
- Link raw resources to normalized entities rather than overwriting source provenance.
- Store mapping releases and field mappings so historical imports can be reproduced.
- Track sync checkpoints per source and resource stream; reject stale or incomplete snapshots when policy requires current data.
- Use subscriptions/webhooks for near-real-time hints and reconciliation jobs for completeness.
- Quarantine malformed, unauthorized or non-idempotent messages in dead letters; replay requires a reason and authorization.

## 10. Security and privacy implementation

- Put secrets and encryption keys in a KMS or secrets manager; database columns retain only secret references or ciphertext.
- Encrypt backups, replicas and transport; use separate database roles for migrations, application reads/writes, policy engine, optimizer, integrations and auditors.
- Require `SET LOCAL app.tenant_id`, `app.actor_id`, `app.purpose_of_use` and `app.correlation_id` at the start of every application transaction.
- Log data access separately from row mutation, including patient/encounter scope, fields, purpose, legal basis and break-glass session.
- Break-glass access is time-bounded, reason-required, scope-limited and reviewed afterward.
- Audit payloads are redacted and append-only. Export and disclosure records are separately approved and retained.
- Rate limits apply by tenant, principal, client and tool; high-risk action tools have tighter limits.

## 11. Partitioning, retention and scale

- Range-partition high-volume append tables by month: `audit.audit_events`, `audit.row_changes`, `audit.data_access_events`, `mcp.protocol_logs`, `capacity.bed_status_events`, `analytics.metric_observations`, `integration.external_events`, `integration.inbox_events`, `integration.outbox_events`, `planning.demand_observations` and raw HL7/FHIR history where volume warrants.
- Retention is data-classification and jurisdiction driven; `core.retention_policies` controls archive, purge, anonymization and legal-hold behavior.
- Legal holds override scheduled deletion. Retention actions are append-only and evidence-linked.
- Use read replicas for dashboards and reporting, but route policy gates, approvals and execution to the primary.
- Rebuildable projections may be cached; authoritative snapshots, evaluations, approvals, executions and audit evidence are never cache-only.

## 12. Deployment and migration sequence

1. Provision PostgreSQL, encryption, backups, private networking and least-privilege roles.
2. Apply the SQL in one controlled migration transaction to a clean database.
3. Create service-specific grants; do not grant application roles ownership or `BYPASSRLS`.
4. Seed tenant, organization, facilities, terminology, role definitions and permission mappings.
5. Register source systems, mappings and test connections.
6. Import policies, extract rules, attach evidence and run rule tests before publishing.
7. Register MCP server, deployments, OAuth clients, tool releases, resources and prompts.
8. Run synthetic hospital scenarios and concurrency tests before connecting production feeds.
9. Conduct a restore drill and failover exercise before operational use.
10. Release action tools only after read-only observation shows source freshness and policy agreement.

## 13. Required test suite

- Migration up/down and empty-database build tests.
- Foreign-key, check, exclusion, trigger and row-level-security tests.
- Cross-tenant isolation tests for every role and MCP tool.
- Policy rule unit tests, conflict tests, effective-date tests and non-overridable hard-rule tests.
- Golden surge scenarios covering bed overflow, ICU constraints, negative-pressure isolation, credential expiry, fatigue, device shortage, supply shortage and transfer failure.
- Property tests proving generated plans never violate hard constraints.
- Concurrency tests for the last bed, last qualified practitioner, duplicate execution request and stale approval hash.
- Integration contract tests against FHIR/HL7 fixtures, pagination, retries, duplicate messages, out-of-order events and partial outages.
- Audit completeness and tamper-resistance tests.
- Backup restore, point-in-time recovery and regional failover drills.
- Load tests at expected peak event rate plus emergency multiplier, with policy-gate latency measured separately.

## 14. Operational views included

- `capacity.v_current_bed_state`: current bed state, active occupancy and active hold.
- `workforce.v_practitioner_eligibility`: role validity, current credentials/privileges, restrictions and recent fatigue risk.
- `clinical.v_active_queue_pressure`: active entries, service-level breaches, average, longest and p90 wait.
- `planning.v_plan_gate_summary`: unresolved violations and the plan-level clear/conditional/blocked gate.

## 15. Files in the package

- `surgeguard_production_schema.sql` — canonical DDL.
- `surgeguard_database_blueprint.md` — architecture, workflows, controls and deployment guidance.
- `surgeguard_data_dictionary.csv` — every parsed table column and definition.
- `surgeguard_constraints_indexes.csv` — table constraints and explicit indexes.
- `surgeguard_schema_manifest.json` — machine-readable schema inventory and counts.
- `surgeguard_mcp_contracts.json` — MCP tools, resources, prompts, security rules and error catalog.
