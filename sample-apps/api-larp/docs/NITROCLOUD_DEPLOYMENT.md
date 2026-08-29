# NitroCloud deployment and smoke test

This guide deploys the same build verified locally and proves the hosted MCP surface after rollout.

## 1. Pre-deployment gate

Use Node.js 20.18+.

```bash
npm ci
npm run check
git status --short
```

Expected outcomes:

- type-check passes
- 14 offline tests pass
- six widget applications bundle successfully
- production TypeScript compiles
- no `.env`, credentials, `.apiguard/`, or `artifacts/` files are staged

## 2. Choose a deployment profile

### Recommended judged profile

Stable pinned evidence plus the real bounded Gemini classifier:

```dotenv
NODE_ENV=production
DEMO_SCENARIO=risky
USE_LIVE_GITHUB=false
USE_LLM=true
LLM_PROVIDER=gemini
GEMINI_API_KEY=<NitroCloud secret>
GEMINI_MODEL=gemini-3.6-flash
LLM_TIMEOUT_MS=30000
LOG_LEVEL=info
```

### Credential-free fallback

```dotenv
NODE_ENV=production
DEMO_SCENARIO=risky
USE_LIVE_GITHUB=false
USE_LLM=false
LOG_LEVEL=info
```

### Live evidence

Add the following only when GitHub search has been tested and rate limits are healthy:

```dotenv
USE_LIVE_GITHUB=true
GITHUB_TOKEN=<fine-grained read token>
DEMO_GITHUB_OWNER=arckrisofficial
DEMO_GITHUB_REPOSITORIES=apiguard-react-consumer,apiguard-python-consumer,apiguard-go-consumer
ALLOWED_GITHUB_OWNERS=arckrisofficial
```

## 3. GitHub write configuration

Keep writes disabled for ordinary analysis:

```dotenv
APIGUARD_GITHUB_WRITE_ENABLED=false
```

For the controlled PR segment, configure only a disposable repository:

```dotenv
APIGUARD_GITHUB_WRITE_ENABLED=true
APIGUARD_WRITABLE_REPOSITORIES=arckrisofficial/apiguard-go-consumer
FIX_BRANCH_PREFIX=apiguard
GITHUB_TOKEN=<fine-grained token with required contents and pull-request permissions>
```

Do not enable writes on a public unauthenticated endpoint. Restrict access through MCP authentication or an authenticated gateway first.

## 4. Deploy from GitHub

1. Sign in to NitroCloud.
2. Create or open the `api-larp` project.
3. Connect `arckrisofficial/api-larp`.
4. Select branch `main`.
5. Enable auto-deploy on push if desired.
6. Add environment variables through the NitroCloud secret/environment UI.
7. Deploy commit `main` and wait for the rollout to become live.
8. Copy the displayed MCP URL. The current Streamable HTTP endpoint convention for this project is `/mcp`.

The repository’s GitHub Actions `Deploy` workflow publishes a tested container to GHCR. A green GHCR workflow does not by itself prove NitroCloud has rolled out the same revision; verify the public MCP endpoint separately.

## 5. Verify the hosted surface

Set:

```dotenv
DEPLOYED_MCP_URL=https://your-app.nitrocloud.ai/mcp
```

Then run:

```bash
npm run smoke:deployed
```

In an MCP client, confirm the hosted server exposes:

- 14 tools
- 6 resources
- `review_api_release`
- six result widgets
- `apiguard-liveness` and `apiguard-readiness`

If `create_migration_pull_requests` is missing, the endpoint is serving an older revision. Check the selected branch, latest deployment commit, build logs, and rollout history before recording.

## 6. Hosted assessment smoke flow

1. Call `diff_api_spec` with `scenarioId: risky`.
2. Call `run_impact_assessment` with `scenarioId: risky` and `forceRefresh: true`.
3. Confirm the response is not an error and capture its `id` and `version`.
4. Confirm `sourceMode`, `classifierMode`, `modelStatus`, repository commits, coverage, and limitations are present.
5. Call `resolve_consumer_owners`.
6. Call `evaluate_release_policy` with `STRICT`.
7. Record a `BLOCK` decision with a unique idempotency key.
8. Export and read a fresh evidence package containing that decision.
9. Verify migration readiness and confirm it distinguishes remediation readiness from release approval.
10. Read `apiguard://assessments/{assessmentId}` and confirm the versioned state changed.

Do not begin the GitHub-write segment until this read/governance path succeeds remotely.

## 7. Controlled PR smoke test

Use a disposable consumer repository only.

Verify before calling the tool:

- assessment is `BLOCKED_PENDING_MIGRATION`
- repository is exactly allow-listed
- proposed file path appears as confirmed/likely impacted evidence
- complete source and `expectedSourceHash` came from `get_pinned_migration_sources`
- proposed content is complete-file content, not a patch fragment
- `confirmed: true` is intentional

After creation, use GitHub itself to verify:

- returned URL exists
- PR is draft and open
- base is the expected default branch
- head is namespaced
- default branch SHA did not change
- assessment comment exists
- replaying the same idempotency key returns the same PR

## 8. Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| Hosted server lists 12 tools | Old NitroCloud revision | Confirm project branch is `main` and redeploy latest commit |
| Snapshot hash mismatch | Old fixture copied into image | Run a clean build and verify `dist/fixtures` |
| `LLM classifier is disabled` | `USE_LLM` missing/false | Set provider, model, key, and timeout in NitroCloud |
| Model falls back with abort | Timeout too short | Set `LLM_TIMEOUT_MS=30000` |
| GitHub search returns partial coverage | Rate limit/auth/repository failure | Use pinned snapshot for demo; inspect coverage and limitations |
| Repository not writable | Allow-list guard | Add only the exact disposable repository |
| Pinned source hash mismatch | Consumer moved or wrong hash | Refresh evidence or recompute from the pinned commit; do not bypass |
| Assessment ID rejected | Hosted server predates UUID-schema fix | Deploy commit `f05492d` or newer |

## 9. Post-demo cleanup

- Leave migration PRs draft or close them manually; do not merge solely for the demo.
- Disable `APIGUARD_GITHUB_WRITE_ENABLED`.
- Remove or rotate the GitHub write token.
- Review NitroCloud logs for accidental credential output.
- Preserve assessment IDs, package IDs, PR URLs, and the deployed commit for the submission record.
