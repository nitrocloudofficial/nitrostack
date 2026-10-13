# APIGuard Existing MCP Audit and Full Revision Plan

## Scope of this audit

This plan reviews the uploaded current implementation of:

- `apiguard.tools.ts`
- `apiguard.resources.ts`
- `apiguard.prompts.ts`
- `apiguard.module.ts`
- `assessment.service.ts`
- `assessment.repository.ts`
- `spec.repository.ts`
- `evidence.service.ts`
- `snapshot-evidence.provider.ts`
- `github-evidence.provider.ts`
- `repository-scope.repository.ts`
- `repository-scope.service.ts`
- `risk.prompt.ts`
- `risk.service.ts`
- `risk.schemas.ts`
- `evidence.schemas.ts`
- `config.service.ts`
- `system.health.ts`

The following current files were not supplied and therefore remain unverified:

- `openapi-diff.ts`
- `deterministic-risk.ts`
- `decision-state.ts`
- shared domain `types.ts`
- widget implementation
- package scripts and generated NitroStack types

This is not just a dynamic-spec plan. It revises the existing MCP capabilities, their boundaries, persistence, evidence lifecycle, safety, and orchestration.

---

# 1. Executive verdict

The project concept remains strong:

- deterministic OpenAPI change detection
- bounded LLM use
- repository evidence
- human release decision
- MCP tools, resources, prompt, and widget

However, the present implementation contains several faults that can cause a technically incorrect or misleading judged result.

## Judging-killer defects

1. `refresh_repository_evidence` does not refresh evidence.
2. `forceRefresh` is accepted but ignored.
3. Repository-scope changes do not affect the default snapshot assessment path.
4. The lower-level tools independently recompute work and can disagree.
5. Snapshots are not bound to scenario hashes or repository-scope versions.
6. An assessment can be marked `COMPLETE` and `LOW` even when evidence is empty or incomplete.
7. Assessments disappear after process restart.
8. Repository-scope persistence can fail while the tool still reports success.
9. Public write tools have no authentication or rate limiting.
10. The review prompt skips the required evidence lifecycle.

The project should not add more feature tools until these are corrected.

---

# 2. Current MCP surface: keep, revise, merge, or deprecate

## 2.1 `diff_api_spec`

### Decision

**KEEP AND REVISE**

### Current strengths

- deterministic
- cheap
- independently testable
- useful to engineers
- clear MCP tool boundary

### Current faults

- fixture-only input
- response has no validation summary
- response has no warning list for unsupported OpenAPI constructs
- response does not distinguish breaking and non-breaking counts
- response does not return a stable `diffId` or `diffHash`
- manually maintained example output can drift from the real domain type
- it may be called separately from assessment and produce a result from a different scenario version if dynamic scenarios are later mutable

### Revised input

```ts
{
  scenarioId: string;
}
```

Keep the input small.

### Revised output

```ts
{
  scenarioId: string;
  sourceType: "FIXTURE" | "INLINE" | "URL";

  baselineSpecHash: string;
  candidateSpecHash: string;
  diffHash: string;

  validation: {
    openApiVersion: string;
    operationCountBaseline: number;
    operationCountCandidate: number;
    warnings: string[];
  };

  summary: {
    totalChanges: number;
    breakingChanges: number;
    nonBreakingChanges: number;
    unsupportedChanges: number;
  };

  changes: ApiChange[];
}
```

### Required behaviour

- explicit unknown scenario returns `SCENARIO_NOT_FOUND`
- no silent fallback to `risky`
- unsupported constructs appear as warnings or typed changes
- example response must use `satisfies DiffApiSpecOutput`

---

## 2.2 `discover_consumer_evidence`

### Decision

**DEPRECATE AS AN EXPENSIVE DISCOVERY TOOL**

The current name and behaviour conflict with `refresh_repository_evidence`.

Two tools that both appear to “discover” or “refresh” evidence will cause judge confusion.

### Current faults

- recomputes the diff
- may trigger GitHub calls
- does not persist a snapshot
- does not return a snapshot ID
- does not return repository coverage
- can produce different evidence from a later risk or assessment call
- overlaps directly with `refresh_repository_evidence`

### Recommended replacement

Expose stored evidence as a resource:

```text
apiguard://evidence-snapshots/{snapshotId}
```

Optionally retain a narrow read-only filtering tool:

```text
query_consumer_evidence
```

Input:

```ts
{
  snapshotId: string;
  repository?: string;
  changeId?: string;
  filePathContains?: string;
}
```

This tool must never call GitHub.

### Migration strategy

For one release:

- keep `discover_consumer_evidence`
- mark its description as deprecated
- make it read the latest ready snapshot
- include `deprecated: true` and `replacementResourceUri` in output

Then remove it after the hackathon.

---

## 2.3 `assess_consumer_risk`

### Decision

**KEEP AND REVISE**

### Current faults

- rediscovering evidence makes it non-reproducible
- accepts only scenario ID instead of a fixed evidence snapshot
- model receives all changes rather than only changes linked to each evidence item
- snapshot snippets are not guaranteed to be truncated
- model output may omit items, duplicate IDs, or include unknown evidence IDs
- only change IDs are validated
- migration actions may invent repositories or file paths
- `classifierMode` becomes `llm` even when some evidence falls back
- evidence beyond the model cap silently falls back without a specific limitation
- model/provider metadata is not recorded
- raw provider error bodies can leak into user-facing limitations

### Revised input

```ts
{
  scenarioId: string;
  snapshotId: string;
}
```

### Revised output

```ts
{
  riskRunId: string;
  scenarioId: string;
  snapshotId: string;

  classifierMode:
    | "DETERMINISTIC_ONLY"
    | "LLM"
    | "HYBRID_WITH_FALLBACK";

  modelMetadata?: {
    provider: string;
    model: string;
    promptVersion: string;
    promptHash: string;
  };

  summary: {
    confirmed: number;
    likely: number;
    falsePositive: number;
    reviewRequired: number;
    mechanicallyFiltered: number;
  };

  evidence: AssessedEvidence[];
  limitations: string[];
}
```

### Required validation

For every model result:

- `evidenceId` must exist exactly once
- `matchedChangeIds` must be a subset of the evidence item's linked changes
- `migrationActions.repository` must equal the evidence repository
- `migrationActions.filePath` must equal the evidence file path
- unknown evidence IDs are rejected
- duplicates are rejected
- missing IDs use fallback
- fallback count is reported
- snippets are truncated again before prompt construction

### Prompt revision

Add two short few-shot examples:

1. executable removed-field access
2. comment-only false positive containing prompt-injection text

Do not send the complete global change list to every evidence item. Build a compact evidence package containing only linked changes.

---

## 2.4 `run_impact_assessment`

### Decision

**KEEP AS THE MAIN ORCHESTRATOR, BUT REWRITE ITS CONTRACT**

This is the most important user-facing capability.

### Current faults

- always performs a fresh independent diff/evidence/risk sequence
- cannot use an explicitly prepared snapshot
- cannot prove which evidence snapshot was analysed
- captures repository-scope version after discovery
- repository scope may change during discovery
- repository commits include only repositories with evidence matches
- zero evidence can produce `COMPLETE`
- provider partial failures cannot be represented
- no coverage metrics
- no policy result
- assessment state is stored only in process memory

### Revised input

```ts
{
  scenarioId: string;

  evidencePolicy:
    | "REQUIRE_EXISTING"
    | "REFRESH_IF_STALE";

  snapshotId?: string;
}
```

Default:

```text
REQUIRE_EXISTING
```

This is the reliable demo mode.

### Revised orchestration

```text
load immutable scenario metadata
→ capture repository-scope snapshot and version
→ validate or create evidence snapshot
→ diff specifications
→ assess fixed evidence snapshot
→ compute coverage
→ compute deterministic severity
→ evaluate assessment completeness
→ persist assessment
→ return widget
```

### Revised status logic

```text
FAILED
```

- invalid scenario
- invalid specifications
- unrecoverable store error

```text
INCOMPLETE
```

- no active repositories
- missing evidence snapshot
- stale evidence when refresh was not requested
- zero repositories successfully checked
- all repository searches failed

```text
COMPLETE_WITH_WARNINGS
```

- some repository failures
- review-required evidence
- LLM fallback occurred
- coverage below threshold

```text
COMPLETE
```

- scenario and evidence hashes match
- scope version matches
- expected repositories were checked
- no unhandled provider failures

### Severity rule correction

Do not calculate severity from evidence classifications alone.

Minimum policy:

```text
Breaking changes + confirmed evidence → HIGH

Breaking changes + likely/review evidence → MEDIUM

Breaking changes + no trustworthy evidence → MEDIUM + INCOMPLETE

No breaking changes → LOW

Breaking changes + complete coverage + only false positives → LOW
```

### Revised assessment metadata

```ts
{
  scenarioSourceType: string;
  evidenceSnapshotId: string;
  evidenceGeneratedAt: string;
  evidenceScopeVersion: number;
  repositoriesExpected: string[];
  repositoriesChecked: string[];
  repositoriesFailed: string[];
  coverageRatio: number;
  riskRunId: string;
}
```

---

## 2.5 `record_release_decision`

### Decision

**KEEP AND HARDEN**

### Current faults

- caller may supply `actorId`
- caller may supply `actorDisplayName`
- a remote caller can impersonate another actor
- no authentication guard is visible
- no rate limit is visible
- user must manufacture an idempotency key
- assessments disappear on restart
- decision-state rules could not be verified because `decision-state.ts` was not supplied

### Revised input

```ts
{
  assessmentId: string;
  expectedVersion: number;
  decision: "APPROVE" | "BLOCK";
  reason?: string;
  clientRequestId?: string;
}
```

### Actor source

```ts
const actorId =
  ctx.auth?.subject ??
  this.config.demoActorId;
```

Do not accept actor identity from tool input.

### Revised rules

- block requires reason
- approval requires `COMPLETE`, not `INCOMPLETE`
- approval of `COMPLETE_WITH_WARNINGS` requires an override reason
- stale version fails
- duplicate request is idempotent
- conflicting decision fails
- decision persists outside process memory
- return resource URI for readback

### Security

Add an API-key or OAuth guard to write tools in NitroCloud.

Add a small rate limit.

---

## 2.6 `manage_repository_scope`

### Decision

**KEEP AND REWRITE FOR IDEMPOTENCY AND DURABILITY**

### Current strengths

- public-repository restriction
- owner allow-list
- commit pinning
- inactive rather than delete
- historical intent is good

### Current faults

1. capacity is checked before determining whether the repository already exists
2. re-adding an already-active repository may fail at capacity
3. every add reports `changed: true`
4. unchanged repository additions increment scope version
5. GitHub owner and repository casing is not normalised
6. case variants can create duplicate IDs
7. no network timeout
8. async bootstrap runs from constructor without being awaited
9. bootstrap failures are swallowed
10. file persistence errors are logged but the tool still reports success
11. loaded JSON is not schema-validated
12. corrupt storage silently becomes an empty scope
13. local file storage is not safe for multiple cloud instances
14. no guard or rate limit is visible

### Revised service flow

```text
normalise owner/name to lowercase canonical key
→ validate owner and repository
→ load existing record
→ check capacity only if a new active slot is needed
→ resolve GitHub metadata with timeout
→ compare desired record with stored record
→ return changed=false if identical
→ persist transactionally
→ increment version once
→ emit repository.scope.updated
```

### Revised result

```ts
{
  changed: boolean;
  action: "ADD" | "REMOVE";
  previousScopeVersion: number;
  scopeVersion: number;
  repository: ManagedRepository;
  evidenceInvalidated: boolean;
  nextTool?: "refresh_repository_evidence";
}
```

### Persistence

Use a storage interface:

```ts
interface RepositoryScopeStore {
  getCurrent(): Promise<RepositoryScope>;
  saveExpectedVersion(
    expectedVersion: number,
    next: RepositoryScope
  ): Promise<RepositoryScope>;
}
```

Local:

- file store with schema validation

Cloud:

- managed database or external KV with optimistic concurrency

Do not report success when persistence fails.

---

## 2.7 `refresh_repository_evidence`

### Decision

**KEEP, BUT ITS CURRENT IMPLEMENTATION IS MISNAMED AND INCOMPLETE**

### Current critical fault

It only refreshes repository commit SHAs.

It does not:

- clear evidence cache
- use `forceRefresh`
- run a contract diff
- generate search queries
- search code
- persist evidence
- create a snapshot ID

### Revised input

```ts
{
  scenarioId: string;
  repositories?: string[];
  refreshCommitShas: boolean;
  forceRefresh: boolean;
}
```

### Revised behaviour

```text
resolve scenario
→ capture current repository-scope version
→ optionally refresh commit SHAs
→ capture final immutable scope snapshot
→ diff scenario
→ clear cache when forceRefresh=true
→ search repositories
→ continue on individual repository failures
→ create EvidenceSnapshotV2
→ persist snapshot
→ return snapshot ID and coverage
```

### Revised output

```ts
{
  scenarioId: string;
  snapshotId: string;

  status:
    | "COMPLETE"
    | "PARTIAL"
    | "FAILED";

  repositoryScopeVersion: number;
  repositoriesExpected: string[];
  repositoriesChecked: string[];
  repositoriesFailed: Array<{
    repository: string;
    errorCode: string;
  }>;

  evidenceItems: number;
  generatedAt: string;

  baselineSpecHash: string;
  candidateSpecHash: string;

  nextAction:
    | "RUN_IMPACT_ASSESSMENT"
    | "REVIEW_FAILED_REPOSITORIES";
}
```

### NitroStack task support

Mark it `taskSupport: "optional"`.

Report progress:

```text
Resolving contract pair…
Refreshing repository 1 of 4…
Searching query 2 of 6…
Writing evidence snapshot…
```

Check cancellation between repositories and queries.

---

# 3. Evidence subsystem audit

## 3.1 Global evidence mode is the wrong abstraction

Current behaviour:

```text
USE_LIVE_GITHUB=true
  → all evidence calls are live

USE_LIVE_GITHUB=false
  → all evidence calls use fixture snapshots
```

This means repository management may have no effect in the default demo mode.

### Revision

Evidence choice must be attached to a snapshot, not a global mode.

```ts
EvidenceSnapshot.origin:
  | "FIXTURE"
  | "GITHUB"
```

The assessment consumes a snapshot ID regardless of origin.

---

## 3.2 Snapshot schema is insufficient

Current schema does not bind evidence to:

- scenario ID
- baseline hash
- candidate hash
- repository-scope version
- query-plan hash
- failed repositories
- capture status

It also models scope as one owner plus repository names, although the repository registry supports multiple owners.

### EvidenceSnapshotV2

```ts
interface EvidenceSnapshotV2 {
  schemaVersion: 2;

  snapshotId: string;
  scenarioId: string;
  origin: "FIXTURE" | "GITHUB";

  baselineSpecHash: string;
  candidateSpecHash: string;
  repositoryScopeVersion: number;

  queryPlanHash: string;
  generatedAt: string;

  repositoriesExpected: Array<{
    owner: string;
    name: string;
    branch: string;
    commitSha: string;
  }>;

  repositoriesChecked: string[];

  repositoriesFailed: Array<{
    repository: string;
    errorCode: string;
  }>;

  queries: EvidenceSnapshotQuery[];
  results: EvidenceSnapshotResult[];
}
```

---

## 3.3 GitHub provider reliability faults

### Current problems

- no timeout
- no partial repository failure handling
- sequential calls can be slow
- rate-limit failure aborts the entire run
- source-file size is unbounded
- search result is from GitHub's indexed branch while source is fetched at a pinned commit
- a path missing at the pinned commit aborts the run
- generic field queries such as `id` and `name` create noise
- only two results per query may undercount impact
- same match may be duplicated across queries
- evidence ID omits owner and can collide across owners
- no explicit cache invalidation method
- no cache metrics

### Required revision

- per-request timeout with `AbortController`
- bounded concurrency, for example 3
- per-repository error isolation
- retry only safe transient statuses
- inspect GitHub rate-limit headers
- maximum source bytes
- owner included in evidence ID
- deduplicate by repository, commit, path, line, and linked change IDs
- structured failure list
- explicit `clearCache()`
- cache hit/miss logs
- use pinned repository tree/content checks before trusting search hits

### Query-plan improvement

Do not search only raw field names.

For each change, generate ranked query candidates:

```text
response.oldField
payload["oldField"]
'oldField'
"oldField"
json:"oldField"
endpoint path
operationId
schema/model name
```

Reject or downgrade overly generic fields unless combined with another signal.

Store the exact query plan in the snapshot.

---

# 4. Risk subsystem audit

## Strengths to preserve

- deterministic pre-filter
- strict classifications
- untrusted-source delimiters
- timeout
- Zod validation
- deterministic severity calculation
- fallback behaviour

## Revisions

1. add few-shot examples
2. send only evidence-linked changes
3. truncate all snippets at service boundary
4. validate exact output coverage
5. validate migration action repository and path
6. add `HYBRID_WITH_FALLBACK`
7. report capped items explicitly
8. store model and prompt metadata
9. sanitize external provider errors
10. separate provider adapters behind an interface
11. add a deterministic no-LLM demo fixture
12. test duplicate and unknown model IDs

---

# 5. Persistence audit

## Assessment storage

Current assessments live in a `Map`.

Consequences:

- decision disappears on restart
- assessment resource fails after deployment restart
- widget follow-up may fail if routed to another instance
- no audit history exists

### Revision

```ts
interface AssessmentStore {
  create(assessment: Assessment): Promise<Assessment>;
  get(id: string): Promise<Assessment | undefined>;
  updateExpectedVersion(
    id: string,
    expectedVersion: number,
    update: Assessment
  ): Promise<Assessment>;
}
```

Local:

- memory adapter

Cloud:

- managed database or external KV

The same requirement applies to:

- dynamic scenarios
- repository scope
- evidence snapshots
- release decisions

Use one persistence abstraction rather than four unrelated storage mechanisms.

---

# 6. Resources revision

## Keep

```text
apiguard://scenarios/{scenarioId}/specs/baseline
apiguard://scenarios/{scenarioId}/specs/candidate
apiguard://assessments/{assessmentId}
apiguard://repository-scope
```

## Add

```text
apiguard://scenarios/{scenarioId}
apiguard://repository-scopes/{version}
apiguard://evidence-snapshots/{snapshotId}
apiguard://risk-runs/{riskRunId}
```

## Resource rules

- read-only
- immutable IDs where possible
- return metadata separately from large payloads
- validate URI identifiers
- return structured not-found errors
- never cause a live GitHub or LLM call

---

# 7. Prompt revision

The current prompt directly tells the client to run `run_impact_assessment`.

That skips:

- scenario registration
- scenario metadata
- evidence readiness
- scope confirmation
- stale snapshot handling

## Revised prompt flow

```text
1. Determine whether the user supplied a scenario ID or raw specs.
2. If raw specs were supplied, call register_api_contract_pair.
3. Read the scenario metadata resource.
4. Read the repository-scope resource.
5. If evidence is missing or stale, ask whether to refresh.
6. Call refresh_repository_evidence if approved.
7. Run run_impact_assessment using the fixed snapshot.
8. Explain deterministic changes separately from model judgments.
9. Show coverage and limitations.
10. Ask for the release decision.
```

Never silently select `risky` for a real user request.

---

# 8. Health and readiness revision

Current health reports `up` based mainly on process state and selected modes.

## Split checks

### Liveness

```text
apiguard-process
```

- process running
- event loop responsive

### Readiness

```text
apiguard-readiness
```

Validate:

- demo scenario exists and parses
- persistence store is reachable
- repository-scope store is healthy
- live GitHub mode has token and active repositories
- enabled LLM provider has a key
- configured storage is writable
- widget and server versions are compatible if detectable

Return `degraded` or `down` when required dependencies are unavailable.

---

# 9. Controller and module structure

The current single tools class contains every capability.

It is still technically manageable, but the project will become difficult to review as new tools are added.

## Split into bounded controllers

```text
ContractTools
  register_api_contract_pair
  diff_api_spec

EvidenceTools
  refresh_repository_evidence
  assess_consumer_risk

AssessmentTools
  run_impact_assessment
  record_release_decision

RepositoryScopeTools
  manage_repository_scope
```

Deprecate `discover_consumer_evidence` in favour of the snapshot resource.

The module should register controllers and services separately.

---

# 10. Security revision

## Write tools requiring protection

```text
register_api_contract_pair
manage_repository_scope
refresh_repository_evidence
record_release_decision
```

## Add

- API-key or OAuth guard
- rate limits
- actor from authenticated context
- audit log
- body and input limits
- allow-listed GitHub owners
- public repository restriction
- remote-spec hostname allow-list
- structured sanitized errors

## Do not expose

- GitHub token
- model API keys
- raw authorization headers
- full upstream error bodies
- arbitrary actor identity

---

# 11. Revised final tool surface

## User-facing tools

1. `register_api_contract_pair`
2. `diff_api_spec`
3. `manage_repository_scope`
4. `refresh_repository_evidence`
5. `assess_consumer_risk`
6. `run_impact_assessment`
7. `record_release_decision`

## Deprecated

8. `discover_consumer_evidence`

Replace it with:

```text
apiguard://evidence-snapshots/{snapshotId}
```

Do not add the previously shortlisted advanced tools until these seven are stable.

---

# 12. Implementation phases

## Phase 0: Baseline tests and freeze

Estimated: 2 hours

- capture current tool and resource schemas
- run current `risky` and `safe` flows
- record expected outputs
- add regression tests
- stop adding unrelated tools

## Phase 1: Shared domain and persistence

Estimated: 4 hours

- create store interfaces
- implement memory adapters
- implement cloud adapter
- add typed errors
- add optimistic concurrency
- migrate assessment and scope stores

## Phase 2: Repository scope correction

Estimated: 3 hours

- canonical owner/repo keys
- idempotent add
- correct capacity checks
- awaited bootstrap
- schema-validated load
- persistence failure propagation
- timeout and rate limit
- emit scope-update event

## Phase 3: EvidenceSnapshotV2

Estimated: 3 hours

- add hashes and scope version
- generalise snapshot store
- add scenario-specific storage
- add staleness calculation
- add immutable snapshot resource

## Phase 4: GitHub provider hardening

Estimated: 4 hours

- timeout
- bounded concurrency
- partial failures
- source-size limits
- deduplication
- improved query plan
- cache invalidation
- rate-limit metadata
- progress and cancellation hooks

## Phase 5: MCP evidence tools

Estimated: 3 hours

- make refresh actually create evidence
- make forceRefresh functional
- add task support
- deprecate discovery tool
- create snapshot resource

## Phase 6: Risk revision

Estimated: 3 hours

- snapshot-based input
- few-shot prompt
- linked-change prompt
- strict result reconciliation
- hybrid classifier mode
- model metadata
- sanitized failures

## Phase 7: Assessment and decision revision

Estimated: 4 hours

- fixed-snapshot orchestration
- coverage metrics
- correct status logic
- corrected severity logic
- durable assessment store
- authenticated decision actor
- decision override rules

## Phase 8: Dynamic contract registration

Estimated: 4 hours

- fixture, inline, and optional URL source modes
- validation
- canonical hashing
- collision rules
- scenario metadata resource
- secure remote fetch or cut it

## Phase 9: Prompt, resources, health, widget

Estimated: 3 hours

- prompt lifecycle
- readiness health
- generated widget types
- typed examples
- new metadata in widget

## Phase 10: NitroStudio and NitroCloud verification

Estimated: 3 hours

- execute every tool manually
- fetch every resource
- run task mode
- verify logs
- restart deployment and verify persistence
- run remote chat flow three times

Total:

```text
36 hours approximately
```

This is already the full remaining hackathon scope. Do not add advanced tools until it passes.

---

# 13. Four-member delegation

## Member 1: MCP and domain lead

- tool schemas
- typed errors
- scenario registration
- resources
- prompt
- module split

## Member 2: evidence and GitHub lead

- EvidenceSnapshotV2
- GitHub provider
- query planning
- cache
- task progress
- refresh tool

## Member 3: assessment and AI lead

- risk prompt/service
- output reconciliation
- assessment status
- severity
- decision rules
- policy tests

## Member 4: persistence, security, widget, deployment

- store adapters
- guards and rate limits
- health/readiness
- widget type generation
- NitroStudio
- NitroCloud
- README and demo

Integration checkpoints:

```text
Hour 6
Hour 13
Hour 20
Hour 28
Hour 33
```

---

# 14. Killer test matrix

## Tool semantics

- refresh tool creates a snapshot ID
- forceRefresh causes a real cache miss
- discovery tool never calls GitHub after deprecation
- risk tool never rediscoveries evidence
- run assessment uses the specified snapshot

## Scope

- re-add active repo is idempotent
- capacity check does not reject an unchanged repo
- case variants cannot create duplicates
- partial refresh does not claim full success
- scope update invalidates evidence

## Evidence

- snapshot spec hashes must match
- scope version must match
- cross-scenario snapshot is rejected
- zero checked repos is incomplete
- one failed repo is warning/partial
- raw generic field query is downgraded
- duplicate hits are removed

## Risk

- duplicate model IDs rejected
- unknown model IDs rejected
- missing item falls back
- invented file path rejected
- capped evidence reported
- prompt injection remains data
- provider outage becomes hybrid fallback

## Assessment

- breaking change plus zero evidence is not LOW/COMPLETE
- checked repo with zero matches remains in coverage
- scope change during assessment is detected
- restart preserves assessment and decision
- stale expected version fails

## Security

- unauthenticated write rejected in cloud mode
- actor cannot be supplied by caller
- rate limit works
- upstream error is sanitized
- private repo rejected
- blocked owner rejected

---

# 15. Hard cuts

Cut these if time is insufficient:

1. URL-based spec registration
2. multiple LLM providers
3. advanced migration-plan generation
4. PR publishing
5. owner resolution
6. policy profiles
7. multiple dynamic storage backends
8. sophisticated UI polish

Do not cut:

- true evidence refresh
- snapshot hashes and scope version
- correct assessment completeness
- durable decision state
- idempotent scope management
- GitHub timeout and partial failure
- authenticated write tools
- regression tests
- NitroCloud restart test

---

# 16. Definition of done

The revised MCP implementation is complete only when:

- every tool name matches its real behaviour
- no tool silently substitutes demo data
- repository-scope changes affect future evidence
- refresh creates immutable scenario-specific evidence
- risk analysis consumes a fixed snapshot
- assessment status represents coverage truthfully
- a breaking change with no evidence is not declared safe
- assessment and decision survive restart
- write tools derive actor identity from context
- resources expose immutable artifacts
- prompt follows the scenario and evidence lifecycle
- health distinguishes liveness from readiness
- every tool is manually tested in NitroStudio
- the full remote flow succeeds three times on NitroCloud
