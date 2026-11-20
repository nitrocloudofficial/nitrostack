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

The header supplies a local demo identity. Keep these shared fixtures on loopback. A missing or unrecognized credential still lists `search`, `get_schema`, `execute` and the dashboard, but every guarded call returns `This action isn't permitted.`, the same safe message as a policy denial. If every call is refused, check the header first.

Tool inputs are strict. An unknown or misspelled argument such as `resourceID` is rejected instead of being ignored. Another team's resource or approval ID behaves exactly like an ID that doesn't exist, so callers can't learn what other teams hold. The server resolves team and scope on every request. The host supplies credentials to the server. The widget operates through the host tool bridge.

1. In **Overview**, select **Request eight GPUs**. Observe REQUIRE_APPROVAL and inspect the pending item in **Approvals**. No instances have been created.
2. Choose **Edit GPU quota** in Overview. Set **Immediate GPUs** to 8 and select **Save policy**.
3. Select **Retry Mumbai request**. Open **Infrastructure** to inspect the eight new instances. The server reports ALLOW followed by EXECUTED.
4. In Overview select **Try Singapore**, then **Inspect audit log**. Compare the region denial and the two Mumbai policy revisions. Use **Reset team demo** to repeat from the seed.

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

Every guardrail a team administrator controls is a setting, and each saved set of settings is a numbered policy revision. No code change or restart is needed.

| Setting | Effect |
| --- | --- |
| `gpu`, `cpu`, `budget`, `deployment` | Requests above these values need review. |
| `regions`, `machines`, `environments` | Anything outside these lists is blocked. |
| `productionDeployments` | `review` (the minimum) or `deny`. |
| `reviewDeletion` | Every deletion needs review, not only production ones. |

- **Boundary.** `seeds/teams.json` is what the organization grants each team. Administrators can tighten regions, environments and production deployments inside it but never widen them. Development cannot enable `production`, and ML cannot change production deployments from `deny` to `review`. Hard limits in `domain/limits.ts`, ownership checks and review of production deployments and deletions are fixed in code.
- **Preview.** `simulate_policy` (**Preview impact** in Policies) re-evaluates the team's last 200 requests against the current and the proposed settings. It lists the requests whose decision would change and counts the pending approvals a save would invalidate. Nothing is saved.
- **Rollback.** `rollback_policy` (**Version history** in Policies) restores the settings of an earlier revision as a new revision. The last 50 revisions are kept, and each rollback is logged as `ROLLBACK`.
- **Approvals.** Every save, rollback or reset starts a new revision, so an approval granted earlier no longer authorizes a replay. The request is re-evaluated against the rules in force.

State files written by an earlier version of the template still load. New settings take the team's seed values, and the current settings become the first revision.

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
├── index.ts                         # Starts the HTTP MCP server on 127.0.0.1
├── app.module.ts                    # Root app: access guardrails, Code Mode, CloudOpsModule
├── modules/cloudops/
│   ├── cloudops.module.ts           # Registers the three tool controllers
│   ├── tools/                       # MCP tools (thin: validate → guard → delegate)
│   │   ├── infrastructure.tools.ts  #   provision, deploy, scale, database, firewall, delete
│   │   ├── insights.tools.ts        #   cost, usage, snapshot, dashboard widget
│   │   └── administration.tools.ts  #   update/simulate/rollback policy, review_approval, reset_demo
│   ├── guardrails/                  # Who may call what, and what a change is allowed to do
│   │   ├── access.guardrails.ts     #   bearer identity + member/admin access policies
│   │   ├── mutation.policy.ts       #   team settings → ordered deny / review / allow rules
│   │   ├── policy-settings.ts       #   team boundary checks + compile proposed settings
│   │   ├── policy-impact.ts         #   current vs. draft decisions for recent requests
│   │   └── guarded-operation.ts     #   project change → collect facts → evaluate → commit → audit
│   ├── domain/                      # Pure logic, no I/O
│   │   ├── limits.ts                #   hard ceilings, regions, machine types
│   │   ├── schemas.ts               #   strict Zod inputs and team settings
│   │   ├── types.ts                 #   Resource, Command, Settings
│   │   └── simulation.ts            #   pricing and change projection
│   ├── state/                       # Per-team persistence
│   │   ├── seeds.ts                 #   loads seeds/teams.json
│   │   ├── identities.ts            #   demo bearer tokens (replace with your IdP)
│   │   ├── team-state.ts            #   state shape, policy versions, atomic transactions
│   │   ├── audit.ts                 #   audit log entries
│   │   └── snapshot.ts              #   caller-facing view shared with the widget
│   └── __tests__/domain.test.ts
└── widgets/
    ├── app/cloudops-dashboard/page.tsx  # Dashboard shell: tabs, status line, walkthrough state
    ├── components/                  # One component per dashboard section
    └── lib/                         # Tool-call hook, result parsing, formatting, walkthrough steps
seeds/teams.json                     # Teams, their initial settings and boundaries
tests/                               # HTTP MCP integration and browser widget tests
```

To add a team, edit `seeds/teams.json`. To connect a real identity provider, replace `state/identities.ts`. To add a new kind of guardrail, add a field to `settingsSchema` in `domain/schemas.ts`, give it a seed value and compile it into a rule in `guardrails/mutation.policy.ts`. The widget imports server code only for types and the shared constants in `domain/limits.ts`.

## Configuration, pricing and limits

- `PORT` defaults to 3100. The server binds to 127.0.0.1.
- `CLOUDOPS_STATE_DIR` defaults to `.cloudops` in the project directory. Use one process per directory. State survives restart. Reset is scoped to the administrator's team.
- Monthly compute price per instance in USD is `2 × vCPU + RAM in GB + 10 × GPU count`. Database storage costs $2 per GB monthly. The seeded database is prepaid. Active GPUs show a deterministic simulated 65% utilization.
- Teams have an immutable 16-GPU ceiling and a $5,000 absolute monthly ceiling. Production deployments need approval. ML Research is restricted to `productionDeployments: deny`, and Development to the development environment. Both restrictions are settings bounded by `seeds/teams.json`.
- The simulator is intended for local demonstrations. It has fixed pricing, a single writer process, seeded identities and no cloud provider integration.

## Going to production

The template keeps policy logic, persistence and identity separate so each can be replaced on its own. It leaves out the following:

- **Storage.** Replace the JSON files in `state/team-state.ts` with a database. Keep immutable policy version rows, an active revision pointer and the same revision check on writes. Cache compiled policies per team and revision, invalidate the cache on change, and keep failing closed when a policy cannot be loaded.
- **Identity.** Replace `state/identities.ts` with your identity provider, and map its roles or scopes to the member and admin access policies.
- **Governance.** Require a second administrator for changes that loosen limits. Add rules that expire, change-freeze windows, a global kill switch, and shadow evaluation of a draft policy in `observe` mode before you enforce it.
- **Policies as data.** For rule shapes the settings cannot express, store extra team rules as data on top of the fixed baseline. Validate them with `assertValidPolicy` and preview them with `simulate_policy` before saving.

## Verification

`npm test` typechecks the server and runs domain and HTTP MCP integration tests with isolated temporary state. `npm --prefix src/widgets run typecheck` checks the React package. For the browser walkthrough run `npx playwright-core install chromium`, then `npm run test:widget`. Alternatively set `CHROME_PATH` to a local Chrome executable. This test opens the packaged widget in a browser with a test host bridge connected to the live server.
