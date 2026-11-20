# Brand Voice Guardian

Let AI answer your customers. You control how it sounds.

Brand Voice Guardian is a local MCP server and dashboard widget for evaluating NitroStack Dynamic Guardrails on AI-written messages. An agent drafts a street-style chat reply ("Yo fam, … no cap"). The guardrail scores the text itself and holds it for review. Raise the team's slang limit, send the same reply to the same running server, and it goes out. The agent's tone changes mid-conversation because the policy changed, not the code. No model API keys, social accounts or email providers are needed for the walkthrough.

Brand chatbots that go off-script make the news. In January 2024 a parcel company's support bot was coaxed into swearing at a customer and writing a poem mocking its own employer. A month later a Canadian tribunal held an airline to a refund its chatbot had invented (*Moffatt v. Air Canada*). (Both incidents are cited from memory, not a fresh search.) Here, profanity and refund or legal promises are code-owned floor rules, while how casual each team may sound is a setting that changes at runtime.

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
node "$repo/typescript/packages/cli/dist/index.js" init brandvoice --preset brand-voice-guardian \
  --description 'Brand Voice Guardian' --author Demo --skip-install
cd brandvoice
npm install --no-save "$bundle"/nitrostack-core-*.tgz "$bundle"/nitrostack-cli-*.tgz
npm --prefix src/widgets install --no-save "$bundle"/nitrostack-widgets-*.tgz
npm start
```

With the branch CLI installed on your PATH, use `nitrostack init brandvoice --preset brand-voice-guardian`. Omitting the preset opens the interactive picker. Choose **Brand Voice Guardian**. Use `npm run dev` to rebuild and watch the server during development. Run `npm run build` after changing widget code. Once built, `npm run start:prod` starts the server without rebuilding.

## Connect and run the walkthrough

Configure a Streamable HTTP MCP client with URL `http://127.0.0.1:3100/mcp` and an HTTP `Authorization` header. Connect a widget-capable NitroStudio session as `Bearer demo-social-admin` and call `show_brandvoice_dashboard`. A second client can connect as `Bearer demo-social-agent` for manual agent calls. Each team has two local fixture credentials.

| Team | Agent credential | Administrator credential |
| --- | --- | --- |
| Gen-Z Social | demo-social-agent | demo-social-admin |
| Brand Marketing | demo-marketing-agent | demo-marketing-admin |
| Customer Support | demo-support-agent | demo-support-admin |

The header supplies a local demo identity. Demo tokens are accepted only on loopback unless you opt in, and real OIDC or API-key identities can be added next to them (see [Going to production](#going-to-production)). A missing or unrecognized credential still lists `search`, `get_schema`, `execute` and the dashboard, but every guarded call returns `This action isn't permitted.`, the same safe message as a policy denial. If every call is refused, check the header first.

Tool inputs are strict. An unknown or misspelled argument such as `messageID` is rejected instead of being ignored. There is no `voice` argument: the server measures voice, slang, profanity and promises from the text, so an agent can't label a street reply "professional". Another team's message or approval ID behaves exactly like an ID that doesn't exist, so callers can't learn what other teams hold. The server resolves team and scope on every request. The host supplies credentials to the server. The widget operates through the host tool bridge.

1. In **Overview**, select **Send street reply**. The reply scores slang 8 against a limit of 4, so the decision is REQUIRE_APPROVAL. Inspect the pending item in **Approvals**. Nothing has been sent.
2. Choose **Edit slang limit** in Overview. Set **Slang review above** to 8 and select **Save policy**.
3. Select **Retry chat reply**. Open **Messages** to inspect the sent reply and its measured voice. The server reports ALLOW followed by EXECUTED.
4. In Overview select **Try press channel**, then **Inspect audit log**. Compare the channel denial and the two slang policy revisions. Use **Reset team demo** to repeat from the seed.
5. Change the policy from outside the dashboard: `npm run policy -- set slang 4 --team social`. The dashboard notes the external change within four seconds, and the next street reply needs review again.

The widget refreshes after each action and polls every four seconds for external calls. In a text-only client use `get_brandvoice_snapshot`, `simulate_policy`, `update_policy`, `rollback_policy`, `review_approval` and `reset_demo`. A policy edit requires the current revision and the full settings object from the snapshot. Ordinary agent credentials can read policy and submit messages. Only the team's administrator can edit, review or reset.

### Watch the agent change its tone

`get_voice_guide` returns the voices the team allows, how each one sounds, and `loudestVoiceWithoutReview`. `score_draft` scores a draft before it is sent. An agent told to "check the voice guide before every reply" writes formally while the limit is low. After `npm run policy -- set slang 8 --team social` its next guide read says `street`, and it starts answering like a rapper in the same conversation. Lower the limit again and it goes back to professional.

## Repeat the five scenarios

Use Gen-Z Social, reset the team before each scenario, and leave unrelated settings at their seed values. The street reply is `Yo fam, your sneakers are fire and the drip is legit, no cap. Real talk, they ship Friday. Bet!` (slang 8).

| Scenario | Initial action | Change and retry |
| --- | --- | --- |
| Voice | Send the street reply to Jordan on chat. Review starts above slang 4. | Set the slang limit to 8. Retry and the reply is sent in the street voice. |
| Reach | Publish a public social post to 60,000 followers. With the seeded statement, total reach is 70,000 against 50,000. | Raise reach to 100,000. The same post executes with 30,000 reach remaining. |
| Channel | Send the street reply on `press`. | Raise slang and reach. Press stays blocked for Gen-Z Social. Brand Marketing can use press. |
| Official retraction | Retract the seeded official statement `social-statement`. Inspect its pending approval. | Reject to keep the statement. Submit again and approve to execute once after re-evaluation. Ordinary policy edits keep official retractions protected. |
| Campaign | Schedule a public social campaign to 5,000 recipients. Review starts above 1,000. | Raise the campaign limit to 5,000. Retry the campaign. The hard limit is 50,000 recipients. |

Profanity (`What the hell, fam`) and binding promises (`we promise a full refund`) are blocked in every scenario, at any slang limit.

## Changing guardrails at runtime

Guardrails are data, not code. Every change becomes a new immutable policy version, and the server's active revision moves forward. The next tool call is evaluated against it, with no restart and no redeploy. The same change can come from six places, and all of them go through the same validation, team boundary and audit trail:

| Where | How | Typical user |
| --- | --- | --- |
| Dashboard | **Policies → Save policy**, **Version history → Restore** | Team administrator |
| MCP tools | `update_policy`, `rollback_policy`, `simulate_policy` | An agent acting for an administrator |
| CLI | `npm run policy -- set slang 8 --team social` | Operator on the server host |
| REST API | `PATCH /guardrails/v1/policies/social/brandvoice-mutation/settings` | Admin console, CI, GitOps |
| Database | Write a version and move the head in MongoDB or Postgres | Another service that owns policy |
| Webhook | Signed `POST /guardrails/webhook` | Policy service telling every replica to refresh |

### See it in two minutes

With `npm start` running and the dashboard open as `demo-social-admin`, open a second terminal:

```sh
npm run policy -- show --team social             # current settings and revision
npm run policy -- set slang 8 --team social      # let the street voice through without review
```

Retry **Send street reply** (or call `send_reply` as `demo-social-agent`). The decision changes from REQUIRE_APPROVAL to ALLOW, and the dashboard shows that the policy was changed outside it. Then:

```sh
npm run policy -- history --team social          # every version, who changed it and from where
npm run policy -- rollback --to 1 --team social  # restore the seed as a new revision
npm run policy -- webhook --team social --send   # signed refresh event, as a policy service would send
npm run policy -- health                         # store, push channel and cache state
```

On startup the demo profile prints a generated control-plane admin key and webhook secret and saves them in `.brandvoice/`. The CLI reads them from there.

### Settings

| Setting | Effect |
| --- | --- |
| `slang` | Messages whose measured slang (0–10) is above this need review. |
| `reach`, `campaign` | Total reach across live messages, and recipients of one campaign, above these need review. |
| `channels`, `voices`, `audiences` | Anything outside these lists is blocked. |
| `officialPosts` | Official statements: `review` (the minimum) or `deny`. |
| `reviewRetraction` | Every retraction needs review, not only official ones. |

The scorer maps slang to a voice: 0 professional, 1–2 friendly, 3–5 playful, 6 and above street.

### What a change cannot do

- **Boundary.** `seeds/teams.json` is what the organization grants each team. A change can tighten channels, audiences and official posts inside it but never widen them. Gen-Z Social cannot enable `press`, and Customer Support cannot change official posts from `deny` to `review`.
- **Floor.** Ownership checks, no profanity, no refund or legal promises, the absolute reach and campaign ceilings, the team boundary and review of official retractions are code-owned rules (`floorRules` in `guardrails/mutation.policy.ts`). They are prepended to every served policy, including a raw policy posted through the API, and a stored rule that reuses a floor rule ID is dropped.
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

| Method and path (under `/guardrails/v1/policies/:team/brandvoice-mutation`) | Body |
| --- | --- |
| `GET` | Active head, settings and the effective policy. `ETag` is the revision. |
| `GET /versions?limit=20` | Version history, newest first |
| `PATCH /settings` | Partial settings, e.g. `{"slang": 8}`. Optional `If-Match: <revision>` |
| `POST /simulate` | `{"settings": {...}}` or `{"policy": {...}}` |
| `POST /versions` | `{"policy": {...}, "comment": "..."}` stores a draft |
| `POST /activate` | `{"version": 7}` with `If-Match` |
| `POST /rollback` | `{"toVersion": 3}` |

`GET /healthz/guardrails` reports the profile, store, push channel and cache without authentication.

### Webhooks

`POST /guardrails/webhook` accepts `{"type": "policy.changed", "tenantId": "social"}` (omit `tenantId` to refresh every team). Sign it like this:

```text
x-nitro-timestamp: <unix seconds>
x-nitro-delivery:  <unique id>            # duplicates are acknowledged and ignored
x-nitro-signature: sha256=<hex HMAC-SHA256(secret, "<timestamp>.<raw body>")>
```

Requests more than five minutes old are refused. `npm run policy -- webhook --team social` prints a ready-to-run `curl`. With `GUARDRAILS_WEBHOOK_MODE=activate`, a `{"type": "policy.activate", "tenantId": "social", "settings": {"slang": 8}}` event also changes the policy. The default mode only refreshes, so a leaked secret can't change guardrails.

State files written by an earlier version of the template still load. Their settings become the team's first version.

## Code Mode and progressive tool discovery

An agent initially sees `search`, `get_schema`, `execute`, and `show_brandvoice_dashboard`. Search for a capability such as “reply to a customer”, inspect the matching tool’s input schema, and call it from the Code Mode sandbox. For example, submit the following script as the `code` argument to `execute` after inspecting `get_voice_guide` and `send_reply`.

```js
const guide = await callTool('get_voice_guide', {});
const street = guide.loudestVoiceWithoutReview === 'street';
return await callTool('send_reply', {
  channel: 'chat',
  customer: 'Jordan',
  text: street
    ? 'Yo fam, your sneakers are fire and the drip is legit, no cap. Real talk, they ship Friday. Bet!'
    : 'Thank you, Jordan. Your sneakers ship on Friday.',
});
```

The nested calls use the connected client's identity and the current team policy. The dashboard opens directly and uses the same guarded tools by name.

## Manual agent requests

Name the channel and the customer or audience when writing. Use a message ID returned by the server when changing an existing message.

| MCP tool | Example request |
| --- | --- |
| `get_voice_guide` | “How casual may we sound right now, and on which channels?” |
| `score_draft` | “Score this draft before sending: ‘Hey, awesome choice!’” |
| `send_reply` | “Reply to Jordan on chat that their sneakers ship Friday. Match the loudest voice we're allowed.” |
| `publish_post` | “Post ‘New colors drop Friday’ publicly on social to our 60,000 followers.” |
| `schedule_campaign` | “Schedule the Winter drop campaign to 5,000 public social recipients.” |
| `boost_message` | “Boost that post to reach 80,000 people.” |
| `edit_message` | “Rewrite that post in a friendlier voice.” |
| `retract_message` | “Retract the official statement social-statement because the dates changed.” |

## Why Dynamic Guardrails Matter for AI Agents

An agent can repeatedly call the same tool while the organization's rules for its voice change: a launch week loosens them, a crisis tightens them. NitroStack verifies a caller, loads the current policy, resolves trusted facts and evaluates rules before entering a protected handler. A slang limit change takes effect on the next call. Server-owned rules (no profanity, no binding promises, reach ceilings and tenant boundaries) still apply, including during human-approved replays.

The application module registers identity and access guardrails. Each validated message runs as a guarded SDK Tool inside a serialized team-state transaction. The context resolver scores the text and supplies voice, slang, profanity, promises, projected reach, channel, audience and ownership. The SDK evaluator selects a rule and the invocation's audit hook captures its decision. Only an allowed handler installs the simulated message projection. Policy, approvals, messages and audit events commit together in a local JSON snapshot.

The SDK preview returns a safe error for a non-allow decision. The application records pending approvals around the SDK call and returns a structured decision to the client. Review reuses the original identity and arguments. A changed revision or changed tone/reach facts invalidate the previous review authority. A fresh evaluation can block the message, open another review or allow it. Retrying a completed review returns its terminal status.

## Project structure

```text
src/
├── index.ts                         # Loads config, starts the policy service, MCP server and control plane
├── app.module.ts                    # Root app: access guardrails, Code Mode, BrandVoiceModule
├── runtime/
│   ├── config.ts                    #   environment variables, profiles and startup safety checks
│   ├── identity.ts                  #   demo, OIDC/JWT and API key token resolvers
│   └── store/                       #   policy store: local files, MongoDB, Postgres
├── control-plane/server.ts          # REST API, webhook and health endpoint
├── modules/brandvoice/
│   ├── tools/                       # MCP tools (thin: validate → guard → delegate)
│   ├── guardrails/
│   │   ├── access.guardrails.ts     #   identity chain + member/admin access policies
│   │   ├── mutation.policy.ts       #   settings → deny / review / allow rules, plus the code-owned floor
│   │   ├── policy-service.ts        #   versions, activation, rollback, cache and refresh
│   │   ├── policy-settings.ts       #   team boundary checks + compile settings
│   │   ├── policy-impact.ts         #   current vs. draft decisions for recent requests
│   │   └── guarded-operation.ts     #   project change → collect facts → evaluate → commit → audit
│   ├── domain/                      # Pure logic: limits, schemas, types, tone scorer
│   ├── state/                       # Team messages, identities, audit, snapshot
│   └── __tests__/domain.test.ts
└── widgets/                         # Dashboard widget (React)
scripts/policy.mjs                   # `npm run policy` CLI
seeds/teams.json                     # Teams, their initial settings and boundaries
tests/                               # HTTP MCP, control plane, webhook and widget tests
env.example                          # Every environment variable with its default
```

To add a team, edit `seeds/teams.json`. To add a new kind of guardrail, add a field to `settingsSchema` in `domain/schemas.ts`, give it a seed value and compile it into a rule in `guardrails/mutation.policy.ts`.

## Configuration, scoring and limits

- `PORT` defaults to 3100 and the control plane to `PORT + 1`. Both bind to `HOST`, default 127.0.0.1.
- `BRANDVOICE_STATE_DIR` defaults to `.brandvoice`. With the file store use one process per directory. A database store supports any number of replicas.
- The tone scorer (`scoreText` in `domain/simulation.ts`) is deterministic and offline. Slang is the number of distinct terms from `SLANG_TERMS` found as whole words, up to 10. Any `PROFANITY_TERMS` word or `PROMISE_PHRASES` phrase is blocked. Replace it with a classifier model later; the guardrail only needs the numbers it returns.
- A reply reaches one person, a post its followers and a campaign its recipients. Each team starts with a published official statement reaching 10,000 people.
- Teams have an immutable 1,000,000 total reach ceiling and a 50,000 recipient campaign ceiling. Official posts need approval. Customer Support is restricted to `officialPosts: deny` and to chat and email, and Gen-Z Social to chat and social.
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
