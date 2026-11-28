# Agent Security Control Room

A research agent wants to send an 8 MB incident report to an approved external destination. Watch the request enter the approval queue, raise the team's limit, and retry on the same running MCP server. Each action changes local simulation records only. All destinations are fictional labels.

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
node "$repo/typescript/packages/cli/dist/index.js" init control-room --preset agent-security \
  --description 'Agent Security Control Room' --author Demo --skip-install
cd control-room
npm install --no-save "$bundle"/nitrostack-core-*.tgz "$bundle"/nitrostack-cli-*.tgz
npm --prefix src/widgets install --no-save "$bundle"/nitrostack-widgets-*.tgz
npm start
```

With the branch CLI installed on your PATH, use `nitrostack init control-room --preset agent-security`. Omitting the preset opens the interactive picker. Choose **Agent Security Control Room**. Use `npm run dev` to rebuild and watch the server during development. Run `npm run build` after changing widget code. Once built, `npm run start:prod` starts the server without rebuilding.

## Connect and run the walkthrough

Connect NitroStudio to `http://127.0.0.1:3100/mcp` with the header `Authorization: Bearer demo-research-admin`. Open `show_security_dashboard`. Use a second client as the agent to submit requests while watching the dashboard.

| Team | Agent | Administrator |
| --- | --- | --- |
| Security Research | demo-research-agent | demo-research-admin |
| Developer Tools | demo-developers-agent | demo-developers-admin |
| Incident Response | demo-response-agent | demo-response-admin |

In Overview choose **Request 8 MB job**, then **Edit outbound limit**. Set **Immediate outbound MB** to 8 and save. Retry the approved destination, try the unapproved destination and inspect the audit log. Inventory shows one job. Each audit decision identifies its policy revision.

## Repeat the five scenarios

Use **Reset team demo** before each scenario.

| Request | Change and retry |
| --- | --- |
| Submit an 8 MB job to `approved_external` with the 2 MB research limit. | Raise the limit to 8. The same request moves from REQUIRE_APPROVAL to ALLOW. |
| Publish a fictional report externally. It requires review. | Set `externalPublishing` to `deny`. Both a new request and replay of the pending one are blocked. |
| Send the job to `unapproved_external`. | Raising the size limit still leaves the destination blocked. Research cannot add it to its allow-list. |
| Delete `research-workspace`, the protected production fixture. | Reject the first request. Submit again and approve to execute once. |
| Export 101 MB. | Raise the immediate limit to 100 MB. The absolute ceiling still blocks the export. |

## Changing guardrails at runtime

| Source | Action |
| --- | --- |
| Dashboard | Edit a policy, preview impact or restore a version. |
| MCP | Call `update_policy` with the current revision and complete settings. |
| CLI | Run `npm run policy -- set outboundMb 8 --team research`. |
| REST | PATCH the settings endpoint as an administrator. |
| Database | Write a policy version and advance its head using the store's version protocol. |
| Webhook | Send a signed refresh after updating the store. |

### See it in two minutes

Keep the dashboard open. Run the following in a second terminal after the first job is held for review.

```sh
npm run policy -- show --team research
npm run policy -- set outboundMb 8 --team research
```

Retry the job on the same server. The dashboard polls every four seconds and shows who changed the policy. Restore the original behavior with `npm run policy -- rollback --to 1 --team research`.

### Settings and limits

A job or export has a per-request outbound limit of 100 MB. A job may request up to 480 minutes. New jobs and publications are checked against their projected team counts, capped at 50 jobs and 100 artifacts. Jobs remain active in this simulator until their workspace is deleted or the team is reset. The editable thresholds send larger requests for review. The absolute ceilings deny them.

Each team can narrow its destinations, workspace types and environments. External publication can require review or be denied. Enable `reviewDeletion` to require review for every workspace deletion. Deleting a protected production workspace always requires review, including under raw stored policies.

### Preview, rollback and approvals

Preview compares recent request facts under the draft settings. Saving creates an immutable version. Rollback copies an earlier version forward. Approving a pending request replays it as the original caller and checks the active policy and projected facts again.

### How replicas stay in sync

Each server caches the compiled policy per team. A change made through this server invalidates the cache immediately. Changes made elsewhere arrive by push (MongoDB change stream, Postgres `LISTEN/NOTIFY`), by the head-revision poll every `GUARDRAILS_POLL_MS`, or by a signed webhook, whichever comes first. If the store is unreachable, the last known good policy is served for up to `GUARDRAILS_MAX_STALE_MS`, after which guarded calls fail closed.

### REST control plane

The control plane listens on `GUARDRAILS_ADMIN_PORT` (default `PORT + 1`) on the same host. Authenticate with `Authorization: Bearer <admin key>` (any team), or with an MCP credential that has the admin role (its own team only). Agent credentials are refused.

| Method and path (under `/guardrails/v1/policies/:team/security-mutation`) | Body |
| --- | --- |
| `GET` | Active head, settings and the effective policy. `ETag` is the revision. |
| `GET /versions?limit=20` | Version history, newest first |
| `PATCH /settings` | Partial settings, e.g. `{"outboundMb": 8}`. Optional `If-Match: <revision>` |
| `POST /simulate` | `{"settings": {...}}` or `{"policy": {...}}` |
| `POST /versions` | `{"policy": {...}, "comment": "..."}` stores a draft |
| `POST /activate` | `{"version": 7}` with `If-Match` |
| `POST /rollback` | `{"toVersion": 3}` |

`GET /healthz/guardrails` reports the profile, store, push channel and cache without authentication.

### Webhooks

`POST /guardrails/webhook` accepts `{"type": "policy.changed", "tenantId": "research"}` (omit `tenantId` to refresh every team). Sign it like this:

```text
x-nitro-timestamp: <unix seconds>
x-nitro-delivery:  <unique id>            # duplicates are acknowledged and ignored
x-nitro-signature: sha256=<hex HMAC-SHA256(secret, "<timestamp>.<raw body>")>
```

Requests more than five minutes old are refused. `npm run policy -- webhook --team research` prints a ready-to-run `curl`. With `GUARDRAILS_WEBHOOK_MODE=activate`, a `{"type": "policy.activate", "tenantId": "research", "settings": {"outboundMb": 8}}` event also changes the policy. The default mode only refreshes, so a leaked secret can't change guardrails.

## Code Mode and manual agent requests

Use `search` and `get_schema` to discover tools. In `execute`, try this request as the research agent.

```js
return await callTool('run_outbound_job', {
  workspaceId: 'research-workspace', destination: 'approved_external',
  outboundMb: 8, durationMinutes: 5
});
```

Use `get_workspaces` to inspect jobs and artifacts, `get_agent_activity` for the audit trail and `get_security_snapshot` for settings and approvals. Other guarded actions are `create_workspace`, `publish_artifact`, `export_data`, `change_workspace_access` and `delete_workspace`.

## Project structure and configuration

Team grants are in `seeds/teams.json`. The simulator and policy compiler live under `src/modules/security/domain/`. The control plane, identity resolvers and policy stores live under `src/control-plane/` and `src/runtime/`. The React dashboard lives under `src/widgets/`. The default local store is `.security/`. See `env.example` for configuration.

## Going to production

The same code runs the demo and production. Configuration decides which.

1. **Choose a store.** Set `MONGODB_URI` (`npm install mongodb`; a replica set enables push) or `DATABASE_URL` (`npm install pg`). The schema is created on first start. The drivers are optional, so the demo installs neither.
2. **Connect identity.** Set `OIDC_ISSUER` and `OIDC_AUDIENCE` (the team is read from `GUARDRAILS_TENANT_CLAIM`, and the admin role from `GUARDRAILS_ADMIN_SCOPE`). Or issue API keys with `GUARDRAILS_API_KEYS`. Demo tokens keep working next to them until you remove `demo` from `GUARDRAILS_IDENTITY`.
3. **Set secrets.** `GUARDRAILS_ADMIN_API_KEY` and `GUARDRAILS_WEBHOOK_SECRET` (comma separated to rotate).
4. **Start with `npm run start:production`** (`GUARDRAILS_PROFILE=production`). The server refuses to start, and lists every problem, if it would use the file store, accept demo tokens, run without secrets or have no real identity configured. In the demo profile it refuses to accept demo tokens on a non-loopback `HOST`.

## Verification

`npm test` builds the project and runs the domain tests and the HTTP integration tests. The integration tests start a real server with isolated temporary state, then exercise MCP tools, the REST control plane, signed webhooks, raw policies and the floor. `npm --prefix src/widgets run typecheck` checks the React package. For the browser walkthrough run `npx playwright-core install chromium`, then `npm run test:widget`. Alternatively set `CHROME_PATH` to a local Chrome executable.
