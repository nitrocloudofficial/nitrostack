# Judge demo guide

## One-sentence story

> APIGuard catches an API change that looks valid in the provider repository, proves which downstream consumers will break, blocks the release, and opens a safe draft migration PR.

## Before recording

- Confirm the hosted server lists all 14 tools, including `get_pinned_migration_sources` and `create_migration_pull_requests`.
- Use `USE_LIVE_GITHUB=false` for stable pinned evidence.
- Enable and test one model provider; Gemini is the verified demo provider.
- Set `LLM_TIMEOUT_MS=30000`.
- For a real PR, set `APIGUARD_GITHUB_WRITE_ENABLED=true` and allow-list exactly one disposable repository.
- Confirm the target repository default branch has not moved from the snapshot-pinned commit.
- Keep the PR draft and do not merge it during the demonstration.
- Have the offline `npm run demo` path ready as a fallback.

## Natural opening prompt

Use this prompt rather than listing tool names:

> I’ve updated the API contract in the `risky` scenario and I’m about to push it. Before I do, check whether this change could break any downstream consumers. If it is unsafe, stop the release, identify the affected repositories and owners, and explain the evidence. Then prepare the required consumer migration and open a draft pull request with the assessment attached. Do not merge anything.

## Five-minute sequence

### 0:00–0:35 — Establish the problem

Show the baseline/candidate contract change or the contract-diff widget.

Say:

> Provider tests do not prove downstream compatibility. APIGuard asks which consumers rely on the changed fields before the release is pushed.

Expected risky diff:

- `id`: integer → string
- required `name`: removed
- `fullName`: optional addition
- `status`: response enum widened with `suspended`

### 0:35–1:45 — Let MCP choose the workflow

Send the natural prompt. Show the tool activity rather than narrating a feature list.

Point out:

- evidence source mode
- pinned repository commit SHAs
- file paths and line ranges
- classifier mode, provider, model status, and limitations
- deterministic facts versus model inference

### 1:45–2:35 — Show concrete consumer impact

Open the impact widget. The important result is not merely `HIGH`; it is the source-backed explanation for React, Python, and Go consumers.

Say:

> The model cannot browse repositories or invent targets. It sees bounded snippets, and its output is reconciled against known evidence and semantic change IDs.

### 2:35–3:15 — Governance

Show owner resolution and the strict policy verdict. Record a block decision only after the evidence is visible.

Recommended reason:

> Confirmed downstream consumers must be migrated before this API release.

Show the assessment resource again and point out the version increment and `BLOCKED_PENDING_MIGRATION` state.

### 3:15–4:25 — Guarded remediation

After recording the block decision, export a fresh evidence package and show readiness. `readyForMigration: true` does **not** mean the API is safe to release; it means the unsafe release is blocked and its confirmed impacted files have complete coverage and resolved owners, so remediation may begin.

Call `get_pinned_migration_sources` to retrieve the complete impacted file and server-computed SHA-256 hash. Then create one migration PR as remediation. Explain the controls while it runs:

- explicit write flag and repository allow-list
- blocked assessment required
- impacted file required
- pinned source commit and SHA-256 revalidation
- namespaced branch
- draft PR only
- idempotent replay
- no automatic merge

### 4:25–5:00 — Finish on proof

Open the real draft PR and its APIGuard comment.

Say:

> We started with an API change and ended with a reviewable, evidence-linked migration—not an unverified AI suggestion and not a direct write to main.

## Verified reference result

- Assessment: `asm_ebdddb8b-3410-4547-a81c-9416f263352f`
- Evidence package: `pkg_333af84512d3c858`
- Draft PR: https://github.com/arckrisofficial/apiguard-go-consumer/pull/1
- Assessment comment: https://github.com/arckrisofficial/apiguard-go-consumer/pull/1#issuecomment-5082574255

These identifiers are evidence of the completed rehearsal. A fresh recording should use the IDs returned by that run.

## Fallback plan

| Failure | Continue the demo with… | What to say |
|---|---|---|
| Gemini timeout/error | Deterministic fallback on the same pinned snapshot | “The model failed closed; executable changed-field access still requires review.” |
| GitHub search rate limit | `USE_LIVE_GITHUB=false` pinned snapshot | “This is reproducible evidence captured from exact public commits, not a live search result.” |
| Widget rendering issue | Raw tool JSON and MCP resource readback | “The UI is a projection; the persisted MCP state is the source of truth.” |
| PR write guard rejects | Show the error and the verified existing draft PR | “The safety control prevented an unapproved or stale write.” |
| NitroCloud unavailable | Local NitroStudio with `npm run demo:llm` | “The same MCP surface is running locally; hosting is currently unavailable.” |

## Claims to use

- “APIGuard is a real NitroStack MCP server.”
- “Semantic compatibility, severity, policy, and decision transitions are deterministic.”
- “The LLM is bounded to ambiguous evidence and has no tools.”
- “Evidence is tied to exact commits and content hashes.”
- “GitHub writes are disabled by default and draft-only.”
- “We verified a real draft migration PR and idempotent publication path.”

## Claims to avoid

- Do not call GitHub search complete dependency discovery.
- Do not call snapshot evidence live.
- Do not claim APIGuard enforces GitHub branch protection.
- Do not describe file-backed storage as an audit database.
- Do not call generated code production-ready before repository tests and review.
- Do not imply APIGuard automatically intercepts every `git push`; that requires hook or CI integration.
