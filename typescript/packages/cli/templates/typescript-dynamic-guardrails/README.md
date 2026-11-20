# CloudOps Guardian

Let AI operate your infrastructure. You control the boundaries.

CloudOps Guardian is a local MCP server and dashboard widget for evaluating NitroStack Dynamic Guardrails. Provision eight simulated GPUs, change the team's immediate quota, and repeat the same request against the same running server. No cloud credentials, billing accounts or model API keys are needed for the walkthrough.

## Scaffold and start the feature-branch build

Use Node.js 20.18.1 or later and npm 9 or later. This preview needs the core, CLI and widget packages from the Dynamic Guardrails branch. From the NitroStack repository root, build and pack all three. The following commands create an independent project in a temporary directory.

```sh
repo="$PWD"
bundle="$(mktemp -d)"
npm --prefix "$repo/typescript" run build
npm pack "$repo/typescript/packages/core" --pack-destination "$bundle"
npm pack "$repo/typescript/packages/cli" --pack-destination "$bundle"
npm pack "$repo/typescript/packages/widgets" --pack-destination "$bundle"
cd "$bundle"
node "$repo/typescript/packages/cli/dist/index.js" init guardian --preset cloudops-guardian \
  --description 'CloudOps Guardian' --author Demo --skip-install
cd guardian
npm install --no-save "$bundle"/nitrostack-core-*.tgz "$bundle"/nitrostack-cli-*.tgz
npm --prefix src/widgets install --no-save "$bundle"/nitrostack-widgets-*.tgz
npm start
```

With the branch CLI installed on your PATH, use `nitrostack init guardian --preset cloudops-guardian`. Omitting the preset opens the interactive picker. Choose **CloudOps Guardian**. Use `npm run dev` to rebuild and watch the server during development. Run `npm run build` after changing widget code. Once built, `npm run start:prod` starts the server without rebuilding.

## Connect and run the walkthrough

Configure a Streamable HTTP MCP client with URL `http://127.0.0.1:3100/mcp` and an HTTP `Authorization` header. Connect a widget-capable NitroStudio session as `Bearer demo-ml-admin` and call `show_cloudops_dashboard`. A second client can connect as `Bearer demo-ml-agent` for manual agent calls. Each team has two local fixture credentials.

| Team | Agent credential | Administrator credential |
| --- | --- | --- |
| ML Research | demo-ml-agent | demo-ml-admin |
| Platform Engineering | demo-platform-agent | demo-platform-admin |
| Development | demo-development-agent | demo-development-admin |

The header supplies a local demo identity. Demo tokens are accepted only on loopback unless you opt in, and real OIDC or API-key identities can be added next to them (see [Going to production](#going-to-production)). A missing or unrecognized credential still lists `search`, `get_schema`, `execute` and the dashboard, but every guarded call returns `This action isn't permitted.`, the same safe message as a policy denial. If every call is refused, check the header first.

Tool inputs are strict. An unknown or misspelled argument such as `resourceID` is rejected instead of being ignored. Another team's resource or approval ID behaves exactly like an ID that doesn't exist, so callers can't learn what other teams hold. The server resolves team and scope on every request. The host supplies credentials to the server. The widget operates through the host tool bridge.

1. In **Overview**, select **Request eight GPUs**. Observe REQUIRE_APPROVAL and inspect the pending item in **Approvals**. No instances have been created.
2. Choose **Edit GPU quota** in Overview. Set **Immediate GPUs** to 8 and select **Save policy**.
3. Select **Retry Mumbai request**. Open **Infrastructure** to inspect the eight new instances. The server reports ALLOW followed by EXECUTED.
4. In Overview select **Try Singapore**, then **Inspect audit log**. Compare the region denial and the two Mumbai policy revisions. Use **Reset team demo** to repeat from the seed.
5. Change the policy from outside the dashboard: `npm run policy -- set gpu 2 --team ml`. The dashboard notes the external change within four seconds, and the next eight-GPU request needs review again.

The widget refreshes after each action and polls every four seconds for external calls. In a text-only client use `get_cloudops_snapshot`, `simulate_policy`, `update_policy`, `rollback_policy`, `review_approval` and `reset_demo`. A policy edit requires the current revision and the full settings object from the snapshot. Ordinary agent credentials can read policy and submit infrastructure operations. Only the team's administrator can edit, review or reset.

## Repeat the five scenarios

Use ML Research, reset the team before each scenario, and leave unrelated settings at their seed values.

| Scenario | Initial action | Change and retry |
| --- | --- | --- |
| GPU | Provision eight development instances in Mumbai, each accelerated with 1 vCPU, 4 GB RAM and 1 GPU. Review starts above 2 GPUs. | Set the immediate limit to 8. Retry for eight IDs and $128 monthly. |
| Spending | Create a 600 GB development Postgres database in Mumbai. The estimate is $1,200 against a $500 budget. | Raise the budget to $2,000. The same request executes with $800 remaining. |
| Region | Send the eight-GPU request to Singapore. | Raise GPU and budget thresholds. Singapore stays blocked for ML Research. Platform Engineering can use Singapore. |
| Production deletion | Request deletion of the seeded production database `ml-db`. Inspect its pending approval. | Reject to preserve the database. Submit again and approve to execute once after re-evaluation. Ordinary policy edits keep production deletion protected. |
| CPU | Request one general development instance in Mumbai with 16 vCPU, 64 GB RAM and zero GPUs. | Raise the immediate CPU limit from 4 to 16. Retry the request. The hard limit is 32 vCPU per instance. |

## Changing guardrails at runtime

Guardrails are data, not code. Every change becomes a new immutable policy version, and the server's active revision moves forward. The next tool call is evaluated against it, with no restart and no redeploy. The same change can come from six places, and all of them go through the same validation, team boundary and audit trail:

| Where | How | Typical user |
| --- | --- | --- |
| Dashboard | **Policies → Save policy**, **Version history → Restore** | Team administrator |
| MCP tools | `update_policy`, `rollback_policy`, `simulate_policy` | An agent acting for an administrator |
| CLI | `npm run policy -- set gpu 8 --team ml` | Operator on the server host |
| REST API | `PATCH /guardrails/v1/policies/ml/cloud-mutation/settings` | Admin console, CI, GitOps |
| Database | Write a version and move the head in MongoDB or Postgres | Another service that owns policy |
| Webhook | Signed `POST /guardrails/webhook` | Policy service telling every replica to refresh |

### See it in two minutes

With `npm start` running and the dashboard open as `demo-ml-admin`, open a second terminal:

```sh
npm run policy -- show --team ml            # current settings and revision
npm run policy -- set gpu 8 --team ml       # raise the immediate GPU limit
```

Retry **Request eight GPUs** (or call `provision_instance` as `demo-ml-agent`). The decision changes from REQUIRE_APPROVAL to ALLOW, and the dashboard shows that the policy was changed outside it. Then:

```sh
npm run policy -- history --team ml         # every version, who changed it and from where
npm run policy -- rollback --to 1 --team ml # restore the seed as a new revision
npm run policy -- webhook --team ml --send  # signed refresh event, as a policy service would send
npm run policy -- health                    # store, push channel and cache state
```

On startup the demo profile prints a generated control-plane admin key and webhook secret and saves them in `.cloudops/`. The CLI reads them from there.

### Settings

| Setting | Effect |
| --- | --- |
| `gpu`, `cpu`, `budget`, `deployment` | Requests above these values need review. |
| `regions`, `machines`, `environments` | Anything outside these lists is blocked. |
| `productionDeployments` | `review` (the minimum) or `deny`. |
| `reviewDeletion` | Every deletion needs review, not only production ones. |

### What a change cannot do

- **Boundary.** `seeds/teams.json` is what the organization grants each team. A change can tighten regions, environments and production deployments inside it but never widen them. Development cannot enable `production`, and ML cannot change production deployments from `deny` to `review`.
- **Floor.** Ownership checks, the absolute GPU, CPU and spending ceilings, the team boundary and review of production deletions are code-owned rules (`floorRules` in `guardrails/mutation.policy.ts`). They are prepended to every served policy, including a raw policy posted through the API, and a stored rule that reuses a floor rule ID is dropped.
- **Validation.** Settings are checked against the schema and the team boundary. A raw policy must be default-deny and may only use facts in the catalog. Anything else is rejected with 422 and nothing is stored.
- **Concurrency.** Every write names the revision it was based on (`revision` in MCP, `If-Match` in REST). If someone else changed the policy first, the write is refused (412) and nothing is lost.

### Preview, rollback and approvals

- **Preview.** `simulate_policy` (**Preview impact** in Policies, `POST …/simulate` in REST) re-evaluates the team's last 200 requests against the current and the proposed policy, and counts the pending approvals a change would invalidate. Nothing is saved.
- **Rollback.** Restoring an earlier version copies it forward as a new version, so history only moves forward. Versions are never edited or deleted.
- **Approvals.** Every activation increments the revision, so an approval granted under an earlier revision no longer authorizes a replay. The request is re-evaluated against the rules in force.

### How replicas stay in sync

Each server caches the compiled policy per team. A change made through this server invalidates the cache immediately. Changes made elsewhere arrive by push (MongoDB change stream, Postgres `LISTEN/NOTIFY`), by the head-revision poll every `GUARDRAILS_POLL_MS`, or by a signed webhook, whichever comes first. If the store is unreachable, the last known good policy is served for up to `GUARDRAILS_MAX_STALE_MS`, after which guarded calls fail closed.

### REST control plane

The control plane listens on `GUARDRAILS_ADMIN_PORT` (default `PORT + 1`) on the same host. Authenticate with `Authorization: Bearer <admin key>` (any team), or with an MCP credential that has the admin role (its own team only). Agent credentials are refused.

| Method and path (under `/guardrails/v1/policies/:team/cloud-mutation`) | Body |
| --- | --- |
| `GET` | Active head, settings and the effective policy. `ETag` is the revision. |
| `GET /versions?limit=20` | Version history, newest first |
| `PATCH /settings` | Partial settings, e.g. `{"gpu": 8}`. Optional `If-Match: <revision>` |
| `POST /simulate` | `{"settings": {...}}` or `{"policy": {...}}` |
| `POST /versions` | `{"policy": {...}, "comment": "..."}` stores a draft |
| `POST /activate` | `{"version": 7}` with `If-Match` |
| `POST /rollback` | `{"toVersion": 3}` |

`GET /healthz/guardrails` reports the profile, store, push channel and cache without authentication.

### Webhooks

`POST /guardrails/webhook` accepts `{"type": "policy.changed", "tenantId": "ml"}` (omit `tenantId` to refresh every team). Sign it like this:

```text
x-nitro-timestamp: <unix seconds>
x-nitro-delivery:  <unique id>            # duplicates are acknowledged and ignored
x-nitro-signature: sha256=<hex HMAC-SHA256(secret, "<timestamp>.<raw body>")>
```

Requests more than five minutes old are refused. `npm run policy -- webhook --team ml` prints a ready-to-run `curl`. With `GUARDRAILS_WEBHOOK_MODE=activate`, a `{"type": "policy.activate", "tenantId": "ml", "settings": {"gpu": 8}}` event also changes the policy. The default mode only refreshes, so a leaked secret can't change guardrails.

State files written by an earlier version of the template still load. Their settings become the team's first version.

## Code Mode and progressive tool discovery

An agent initially sees `search`, `get_schema`, `execute`, and `show_cloudops_dashboard`. Search for a capability such as “GPU provisioning”, inspect the matching tool’s input schema, and call it from the Code Mode sandbox. For example, submit the following script as the `code` argument to `execute` after inspecting `provision_instance`.

```js
return await callTool('provision_instance', {
  region: 'Mumbai', machine: 'accelerated', cpu: 1, memory: 4, gpu: 1,
  count: 8, environment: 'development', workload: 'ML training',
});
```

The nested call uses the connected client's identity and the current team policy. The dashboard opens directly and uses the same guarded tools by name.

## Manual agent requests

Include the workload or application name and environment when creating resources. Use a resource ID returned by the server when changing an existing resource.

| MCP tool | Example request |
| --- | --- |
| `provision_instance` | “Provision eight one-GPU accelerated instances for ML training in Mumbai development, each with 1 vCPU and 4 GB RAM.” |
| `deploy_application` | “Deploy release v1 of inventory in Mumbai development on one general instance with 2 vCPU, 4 GB RAM and zero GPUs.” |
| `scale_infrastructure` | “Scale that development deployment to two replicas.” |
| `create_database` | “Create a 600 GB Postgres database named analytics in Mumbai development.” |
| `modify_firewall_rules` | “On that simulated deployment, allow TCP port 443 from 192.0.2.0/24.” |
| `delete_resource` | “Delete the production database ml-db because its retention period ended.” |
| `get_resource_usage` | “Show the allocation and GPU utilization of my team's resources.” |
| `get_cloud_cost` | “Show each resource's monthly estimate and our remaining budget.” |

## Why Dynamic Guardrails Matter for AI Agents

An agent can repeatedly call the same tool while the organization's operating rules change. NitroStack verifies a caller, loads the current policy, resolves trusted facts and evaluates rules before entering a protected handler. A quota change takes effect on the next call. Server-owned ceilings and tenant boundaries still apply, including during human-approved replays.

The application module registers identity and access guardrails. Each validated mutation runs as a guarded SDK Tool inside a serialized team-state transaction. The context resolver supplies projected cost, GPU allocation, region, environment and ownership. The SDK evaluator selects a rule and the invocation's audit hook captures its decision. Only an allowed handler installs the simulated resource projection. Policy, approvals, resources and audit events commit together in a local JSON snapshot.

The SDK preview returns a safe error for a non-allow decision. The application records pending approvals around the SDK call and returns a structured decision to the client. Review reuses the original identity and arguments. A changed revision or changed cost/allocation facts invalidate the previous review authority. A fresh evaluation can block the operation, open another review or allow execution. Retrying a completed review returns its terminal status.

## Project structure

```text
src/
├── index.ts                         # Loads config, starts the policy service, MCP server and control plane
├── app.module.ts                    # Root app: access guardrails, Code Mode, CloudOpsModule
├── runtime/
│   ├── config.ts                    #   environment variables, profiles and startup safety checks
│   ├── identity.ts                  #   demo, OIDC/JWT and API key token resolvers
│   └── store/                       #   policy store: local files, MongoDB, Postgres
├── control-plane/server.ts          # REST API, webhook and health endpoint
├── modules/cloudops/
│   ├── tools/                       # MCP tools (thin: validate → guard → delegate)
│   ├── guardrails/
│   │   ├── access.guardrails.ts     #   identity chain + member/admin access policies
│   │   ├── mutation.policy.ts       #   settings → deny / review / allow rules, plus the code-owned floor
│   │   ├── policy-service.ts        #   versions, activation, rollback, cache and refresh
│   │   ├── policy-settings.ts       #   team boundary checks + compile settings
│   │   ├── policy-impact.ts         #   current vs. draft decisions for recent requests
│   │   └── guarded-operation.ts     #   project change → collect facts → evaluate → commit → audit
│   ├── domain/                      # Pure logic: limits, schemas, types, pricing
│   ├── state/                       # Team operational state, identities, audit, snapshot
│   └── __tests__/domain.test.ts
└── widgets/                         # Dashboard widget (React)
scripts/policy.mjs                   # `npm run policy` CLI
seeds/teams.json                     # Teams, their initial settings and boundaries
tests/                               # HTTP MCP, control plane, webhook and widget tests
env.example                          # Every environment variable with its default
```

To add a team, edit `seeds/teams.json`. To add a new kind of guardrail, add a field to `settingsSchema` in `domain/schemas.ts`, give it a seed value and compile it into a rule in `guardrails/mutation.policy.ts`.

## Configuration, pricing and limits

- `PORT` defaults to 3100 and the control plane to `PORT + 1`. Both bind to `HOST`, default 127.0.0.1.
- `CLOUDOPS_STATE_DIR` defaults to `.cloudops`. With the file store use one process per directory. A database store supports any number of replicas.
- Monthly compute price per instance in USD is `2 × vCPU + RAM in GB + 10 × GPU count`. Database storage costs $2 per GB monthly. The seeded database is prepaid. Active GPUs show a deterministic simulated 65% utilization.
- Teams have an immutable 16-GPU ceiling and a $5,000 absolute monthly ceiling. Production deployments need approval. ML Research is restricted to `productionDeployments: deny`, and Development to the development environment.
- `env.example` lists every variable with its default.

## Going to production

The same code runs the demo and production. Configuration decides which.

1. **Choose a store.** Set `MONGODB_URI` (`npm install mongodb`; a replica set enables push) or `DATABASE_URL` (`npm install pg`). The schema is created on first start. The drivers are optional, so the demo installs neither.
2. **Connect identity.** Set `OIDC_ISSUER` and `OIDC_AUDIENCE` (the team is read from `GUARDRAILS_TENANT_CLAIM`, and the admin role from `GUARDRAILS_ADMIN_SCOPE`). Or issue API keys with `GUARDRAILS_API_KEYS`. Demo tokens keep working next to them until you remove `demo` from `GUARDRAILS_IDENTITY`.
3. **Set secrets.** `GUARDRAILS_ADMIN_API_KEY` and `GUARDRAILS_WEBHOOK_SECRET` (comma separated to rotate).
4. **Start with `npm run start:production`** (`GUARDRAILS_PROFILE=production`). The server refuses to start, and lists every problem, if it would use the file store, accept demo tokens, run without secrets or have no real identity configured. In the demo profile it refuses to accept demo tokens on a non-loopback `HOST`.

Still out of scope for the template: two-person approval for changes that loosen limits, expiring rules, change-freeze windows, a global kill switch, and shadow evaluation of a draft in `observe` mode. The policy service is the place to add them.

## Verification

`npm test` builds the project and runs the domain tests and the HTTP integration tests. The integration tests start a real server with isolated temporary state, then exercise MCP tools, the REST control plane, signed webhooks, raw policies and the floor. `npm --prefix src/widgets run typecheck` checks the React package. For the browser walkthrough run `npx playwright-core install chromium`, then `npm run test:widget`. Alternatively set `CHROME_PATH` to a local Chrome executable.
