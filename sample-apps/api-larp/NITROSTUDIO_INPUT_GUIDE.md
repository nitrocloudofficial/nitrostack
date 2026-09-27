# NitroStudio input guide

This is the manual counterpart to the natural-language demo. Replace example IDs with values returned by your own run.

## Read-only assessment path

### 1. `diff_api_spec`

```json
{ "scenarioId": "risky" }
```

Expected: four semantic changes, including breaking type/removal changes and one compatible optional addition.

### 2. `refresh_repository_evidence`

```json
{ "scenarioId": "risky", "forceRefresh": true }
```

Expected: `snapshotId`, coverage counts, spec hashes, and `apiguard://evidence-snapshots/{snapshotId}`.

In snapshot mode, this loads the committed pinned fixture. In live mode, it scans the configured active scope. Always inspect `status` and repository failure counts.

### 3. `assess_consumer_risk`

```json
{ "scenarioId": "risky", "snapshotId": "<snapshotId>" }
```

Expected: severity, classifier mode, evidence classifications, and limitations.

### 4. `run_impact_assessment`

```json
{ "scenarioId": "risky", "snapshotId": "<snapshotId>", "forceRefresh": false }
```

Copy the returned `id` and `version`. The assessment ID contains UUID hyphens.

### 5. `resolve_consumer_owners`

```json
{ "assessmentId": "<assessmentId>" }
```

Expected: assignment count, unresolved count, and warnings.

### 6. `evaluate_release_policy`

```json
{ "assessmentId": "<assessmentId>", "profile": "STRICT" }
```

Expected: deterministic policy rules and a `BLOCK`, `WARN`, or `PASS` verdict derived from the assessment.

### 7. `export_release_evidence_package`

```json
{ "assessmentId": "<assessmentId>" }
```

Copy the returned `bundleId`. Read the bundle at `apiguard://evidence-packages/{bundleId}`.

### 8. `verify_migration_readiness`

```json
{ "bundleId": "<bundleId>" }
```

A `false` result is expected before the human block decision is recorded. This means remediation prerequisites are not complete; it does not mean the release is safe.

## Human decision

### 9. `record_release_decision`

```json
{
  "assessmentId": "<assessmentId>",
  "expectedVersion": 1,
  "decision": "BLOCK",
  "reason": "Confirmed downstream consumers must be migrated before this API release.",
  "idempotencyKey": "judge-demo-block-001"
}
```

Use the actual current version. Expected state: `BLOCKED_PENDING_MIGRATION`, version incremented. Read `apiguard://assessments/{assessmentId}` to prove server-side state changed.

Re-run `export_release_evidence_package` after the decision and verify the new bundle. With complete repository coverage, confirmed/likely impacts, and resolved owners, `readyForMigration` should now be `true`. This means remediation may begin while the release remains blocked.

## Guarded GitHub write path

Writes require server environment configuration in addition to tool input:

```dotenv
APIGUARD_GITHUB_WRITE_ENABLED=true
APIGUARD_WRITABLE_REPOSITORIES=owner/disposable-repository
GITHUB_TOKEN=<secret>
```

### 10. `get_pinned_migration_sources`

```json
{
  "assessmentId": "<blockedAssessmentId>",
  "repository": "owner/disposable-repository",
  "paths": ["src/consumer.go"]
}
```

This read-only tool returns complete file content and its exact SHA-256 hash from the assessment-pinned GitHub commit. Use those returned values to prepare the next call; do not calculate against a moving default branch.

### 11. `create_migration_pull_requests`

```json
{
  "assessmentId": "<blockedAssessmentId>",
  "repository": "owner/disposable-repository",
  "files": [
    {
      "path": "src/consumer.go",
      "proposedContent": "<complete replacement file>",
      "expectedSourceHash": "<64-character SHA-256 of pinned source>"
    }
  ],
  "title": "fix: migrate consumer for candidate API contract",
  "idempotencyKey": "judge-demo-migration-001",
  "confirmed": true
}
```

Expected: real GitHub URL, draft `true`, merged `false`, branch, head SHA, base branch, pinned commit, and replay status.

### 12. `publish_assessment_to_pr`

```json
{
  "assessmentId": "<assessmentId>",
  "prUrl": "https://github.com/owner/repository/pull/1",
  "idempotencyKey": "judge-demo-comment-001",
  "confirmed": true
}
```

Expected: real PR and comment URLs. Repeat with the same key to verify idempotency.

## Contract and scope utilities

### `register_api_contract_pair`

```json
{
  "scenarioId": "custom_status_v2",
  "baselineSpec": {
    "openapi": "3.0.3",
    "info": { "title": "Status API", "version": "1.0.0" },
    "paths": { "/status": { "get": { "responses": { "200": { "description": "OK" } } } } }
  },
  "candidateSpec": {
    "openapi": "3.0.3",
    "info": { "title": "Status API", "version": "2.0.0" },
    "paths": {}
  }
}
```

Then call `diff_api_spec` with `custom_status_v2` to prove the diff derives from registered input.

### `manage_repository_scope`

Add:

```json
{
  "action": "ADD",
  "owner": "arckrisofficial",
  "repository": "apiguard-go-consumer",
  "branch": "main",
  "reason": "This repository consumes the User API.",
  "confirmed": true
}
```

Remove uses the same owner/repository with `action: REMOVE`, a reason, and `confirmed: true`. Removal deactivates the entry; it does not erase historical evidence.

## Prompt

Run `review_api_release` with:

| Argument | Value |
|---|---|
| `scenario_id` | `risky` |
| `release_context` | `I am about to push the candidate API contract. Check downstream safety before release.` |

The prompt directs the client through assessment, owners, policy, evidence export, and readiness, then asks for a human decision after presenting the evidence.
