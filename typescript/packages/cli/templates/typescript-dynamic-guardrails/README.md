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

The header supplies a local demo identity. Keep these shared fixtures on loopback. The server resolves team and scope on every request. The host supplies credentials to the server. The widget operates through the host tool bridge.

1. In **Overview**, select **Request eight GPUs**. Observe REQUIRE_APPROVAL and inspect the pending item in **Approvals**. No instances have been created.
2. Choose **Edit GPU quota** in Overview. Set **Immediate GPUs** to 8 and select **Save policy**.
3. Select **Retry Mumbai request**. Open **Infrastructure** to inspect the eight new instances. The server reports ALLOW followed by EXECUTED.
4. In Overview select **Try Singapore**, then **Inspect audit log**. Compare the region denial and the two Mumbai policy revisions. Use **Reset team demo** to repeat from the seed.

The widget refreshes after each action and polls every four seconds for external calls. In a text-only client use `get_cloudops_snapshot`, `update_policy`, `review_approval` and `reset_demo`. A policy edit requires the current revision and the full settings object from the snapshot. Ordinary agent credentials can read policy and submit infrastructure operations. Only the team's administrator can edit, review or reset.

## Repeat the five scenarios

Use ML Research, reset the team before each scenario, and leave unrelated settings at their seed values.

| Scenario | Initial action | Change and retry |
| --- | --- | --- |
| GPU | Provision eight development instances in Mumbai, each accelerated with 1 vCPU, 4 GB RAM and 1 GPU. Review starts above 2 GPUs. | Set the immediate limit to 8. Retry for eight IDs and $128 monthly. |
| Spending | Create a 600 GB development Postgres database in Mumbai. The estimate is $1,200 against a $500 budget. | Raise the budget to $2,000. The same request executes with $800 remaining. |
| Region | Send the eight-GPU request to Singapore. | Raise GPU and budget thresholds. Singapore stays blocked for ML Research. Platform Engineering can use Singapore. |
| Production deletion | Request deletion of the seeded production database `ml-db`. Inspect its pending approval. | Reject to preserve the database. Submit again and approve to execute once after re-evaluation. Ordinary policy edits keep production deletion protected. |
| CPU | Request one general development instance in Mumbai with 16 vCPU, 64 GB RAM and zero GPUs. | Raise the immediate CPU limit from 4 to 16. Retry the request. The hard limit is 32 vCPU per instance. |

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

## Configuration, pricing and limits

- `PORT` defaults to 3100. The server binds to 127.0.0.1.
- `CLOUDOPS_STATE_DIR` defaults to `.cloudops` in the project directory. Use one process per directory. State survives restart. Reset is scoped to the administrator's team.
- Monthly compute price per instance in USD is `2 × vCPU + RAM in GB + 10 × GPU count`. Database storage costs $2 per GB monthly. The seeded database is prepaid. Active GPUs show a deterministic simulated 65% utilization.
- Teams have an immutable 16-GPU ceiling and a $5,000 absolute monthly ceiling. Platform production deployments require approval, ML production deployments are restricted, and Development mutations are limited to the development environment.
- The simulator is intended for local demonstrations. It has fixed pricing, a single writer process, seeded identities and no cloud provider integration.

## Verification

`npm test` typechecks the server and runs domain and HTTP MCP integration tests with isolated temporary state. `npm --prefix src/widgets run typecheck` checks the React package. For the browser walkthrough run `npx playwright-core install chromium`, then `npm run test:widget`. Alternatively set `CHROME_PATH` to a local Chrome executable. This test opens the packaged widget in a browser with a test host bridge connected to the live server.
