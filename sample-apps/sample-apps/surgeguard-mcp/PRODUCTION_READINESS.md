# SurgeGuard production readiness

## Current verdict

SurgeGuard is an industry-style, stateful decision-support demonstration. It is
not ready for clinical production use and must not be connected to protected
health information or used to direct patient care in its current form.

The current implementation is suitable for:

- hackathon judging and product demonstrations;
- workflow discovery with hospital operations stakeholders;
- UI and MCP contract evaluation;
- testing policy-gated planning concepts with synthetic data.

## What is already credible

| Area | Current capability |
| --- | --- |
| Workflow | Clear separation between monitoring, operational updates, plan comparison, safety evaluation, approval and execution |
| Shared state | Command Center and specialist tools read the same persisted simulation state |
| Safety posture | Blocked plans cannot be approved or executed; plan and safety snapshots change only after an explicit recalculation |
| Human control | Approval and execution are separate actions |
| Contracts | Inputs and outputs are schema-validated and include permissions, policy and audit metadata |
| Persistence | Demo state and audit events survive local process restarts |
| UI | Responsive widgets use a consistent operational design system |
| Validation | Build, type, capacity reconciliation, execution stability, planning-snapshot stability and cross-tool synchronization checks pass |

## Production blockers

### Safety, identity and compliance

- Replace fixed demo identity with authenticated users, facilities and tenants.
- Enforce server-side RBAC/ABAC permissions for every read, approval and write.
- Complete clinical safety analysis, hazard controls and independent validation.
- Define HIPAA/privacy controls, data retention, consent and breach procedures.
- Use tamper-evident, append-only audit storage with actor identity and reason.
- Add formal override, escalation and fail-safe behavior for unavailable data.

### Data and interoperability

- Replace synthetic records with validated ADT, bed-management, workforce and policy feeds.
- Implement FHIR/HL7 integration with source provenance, freshness and reconciliation.
- Replace `sql.js` with a transactional production database such as PostgreSQL.
- Add concurrency control, idempotency keys and conflict handling for writes.
- Separate projected outcomes from observed clinical and operational outcomes.

### Reliability and operations

- Deploy behind managed authentication, TLS, secrets management and network controls.
- Add high availability, backups, restore testing and disaster-recovery procedures.
- Add structured telemetry, alerting, SLOs and on-call operational ownership.
- Run load, soak, failure-injection and multi-user concurrency tests.
- Add versioned database migrations and zero-downtime deployment procedures.

### Product assurance

- Run accessibility testing against WCAG 2.2 AA.
- Complete usability testing with incident command, nursing, patient flow and safety teams.
- Validate every threshold, score and recommendation against approved policy sources.
- Add change control, release approval and traceability from requirements to tests.

## Recommended path

1. **Pilot architecture:** PostgreSQL, real authentication, tenant isolation,
   immutable audit trail and read-only source integrations.
2. **Shadow mode:** calculate recommendations from live feeds without allowing
   operational writes; compare results with human decisions.
3. **Controlled pilot:** enable bounded, reversible actions with dual approval
   and continuous safety monitoring.
4. **Production:** proceed only after security, privacy, reliability, clinical
   safety and regulatory sign-off.

## Verification

Run:

```bash
npm run validate:simulation
npm run check
npm run build
```

These checks validate the demonstration implementation. They are not a
substitute for clinical, security, privacy, reliability or regulatory approval.
