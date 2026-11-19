# CloudOps Guardian — product requirements

**Status:** Implementation specification for the CloudOps Guardian CLI preset. This document is the single source of truth for its scope, scaffold, behavior and acceptance criteria. Change requirements here first. The generated README and SDK guide should explain how to use the implemented behavior and link back here.

## Developer experience

A developer scaffolds CloudOps Guardian, starts a local MCP server, opens its dashboard in a widget-capable client and asks an agent to provision eight GPUs in Mumbai. The first attempt requires human approval. The developer raises a team quota in the dashboard and retries the same tool arguments against the same server process. Eight simulated instances appear, and the audit trail shows which policy revision governed each attempt.

Product tagline: “Let AI operate your infrastructure. You control the boundaries.”

The audience is developers evaluating how to delegate infrastructure operations to agents. A guided walkthrough should take about three minutes after setup. A developer must also be able to perform every step manually with a compatible MCP client. All resources, prices and utilization are simulated locally. The guided demo requires no cloud account or model API key.

## Generated project and CLI contract

Replace the staged Corporate Card Controls example in the existing template slot. Keep the internal directory `typescript/packages/cli/templates/typescript-dynamic-guardrails/` and expose it as **CloudOps Guardian** through the interactive picker and `nitrostack init --preset cloudops-guardian`. Update preset resolution, help text, scaffolding tests, next steps and the SDK guide together. Other shipped presets retain their behavior.

The scaffold has two package boundaries. The root owns the MCP server, simulator, build and tests. The nested React package owns the dashboard. Follow the existing widget page and manifest conventions. Bring the shared stylesheet convention from the Code Mode preset into this template and verify that the built widget loads it.

```text
typescript-dynamic-guardrails/
├── README.md
├── package.json                         server dependencies and project scripts
├── tsconfig.json
├── seeds/                               team fixtures, policies, resources and prices
└── src/
    ├── index.ts                         loopback HTTP MCP startup and config
    ├── app.module.ts                    module registration and SDK guardrails config
    ├── modules/
    │   └── cloudops/                    module, tool declarations and domain services
    │       ├── …                        identity, policy provider, simulator, approvals, audit
    │       └── __tests__/               domain and SDK integration tests
    └── widgets/
        ├── package.json                 widget dependencies and typecheck script
        ├── tsconfig.json
        ├── widget-manifest.json
        ├── app/
        │   ├── globals.css              shared tokens, layout, focus and status styles
        │   └── cloudops-dashboard/
        │       └── page.tsx             widget entry and host bridge
        └── components/                  dashboard sections and shared controls
```

Use the existing NitroStack build to bundle the widget and server. The project must run outside the monorepo after installing compatible packages. During branch development, test with packed branch builds of core and CLI. The staged manifest's version range predates the guardrails commit. A clean install against a released SDK containing guardrails is a release gate. Document the branch-build procedure until that gate passes.

## MCP contract

Use CodeModeTransform for progressive discovery. Initially list `search`, `get_schema`, `execute`, and `show_cloudops_dashboard`. Agents discover the eight infrastructure tools by capability, inspect their schemas, and invoke them with `callTool` inside the SDK sandbox. Preserve guarded direct calls by name for compatible clients. The widget and guided demo use the same guarded entry points. Add narrowly scoped dashboard operations for reading snapshots, editing policy, reviewing approvals and resetting demo state. Derive team and role from verified server-side credentials for all of them.

| Tool | Required request information | Successful result |
| --- | --- | --- |
| `provision_instance` | Region, machine type, instance count, vCPU, RAM and GPUs per instance, environment, workload | Created instance IDs and estimated monthly cost |
| `deploy_application` | App name, environment, region, instance configuration, resource requirements, deployment settings | Deployment ID and status |
| `scale_infrastructure` | Resource ID, type, environment, desired count | Previous and resulting capacity and cost |
| `create_database` | Name, engine, region, storage, environment | Database ID and status |
| `modify_firewall_rules` | Owned resource ID, source IP/CIDR, destination or port, protocol, action | Updated simulated rule |
| `delete_resource` | Resource ID, type, environment, reason | Deleted resource ID and recorded outcome |
| `get_resource_usage` | Optional resource filter within verified team | Allocation, utilization and status |
| `get_cloud_cost` | Optional resource filter within verified team | Itemized monthly estimates, total and remaining budget |

Validate tool input with Zod object schemas. Resolve ownership, environment of existing resources, projected usage and price on the server. A tenant-scoped read can return immediately after authorization. For mutations, expose a safe decision, reason, applicable policy revision, execution status and, when available, an approval ID or operation result. An allowed simulator operation can still fail. Record the failure separately from its guardrail decision.

## Enforcement and state

Configure `@McpApp({ guardrails })` with `mode: 'enforce'`, `requireDeclaration: true`, a `PolicyProvider`, an `identityResolver` and a `contextResolver`. Declare protected tools with `@Guardrail({ policy, facts })`. The identity resolver maps a verified credential to principal, team and scopes. The context resolver produces scalar facts from verified identity, normalized arguments and current server records. Keep demo credentials out of the browser bundle. Use the SDK's JSON policy evaluator with default deny. [SDK types and evaluator](../../typescript/packages/core/src/core/guardrails/index.ts) · [Tool execution path](../../typescript/packages/core/src/core/tool.ts)

| SDK result | Product decision | Effect on resources |
| --- | --- | --- |
| `allow` | ALLOW | Handler may execute once |
| `require_approval` | REQUIRE_APPROVAL | Capture a pending request outside the skipped handler |
| `deny` | BLOCK | Preserve state and report a safe reason |
| `require_information`, invalid facts, missing identity or unavailable policy | BLOCK for this attempt | Preserve state and indicate missing information or evaluation failure where safe |

**Policy updates.** Each tenant has versioned settings for GPU and CPU thresholds, monthly budget, permitted regions and machine types, deployment approval thresholds and deletion review. Validate types, units, authorized scope and hard ceilings before saving. Compose the editable settings with server-owned restrictions into SDK policies. Validate the resulting policies against their declared facts. Reject stale revisions. Persist a successful edit and its actor, time, old and new values atomically. The provider's next `getActive(tenantId, policyId, …)` must see the saved revision, including after a process restart. Keep a single locally persisted source for active state, and serialize conflicting changes and executions so concurrent requests cannot exceed a ceiling.

**Team boundaries.** Seed Platform Engineering with larger CPU quotas, Mumbai and Singapore access and production deployment review. Seed ML Research with GPU and budget controls, Mumbai access and restricted production operations. Seed Development with smaller quotas, development-only deployment and no permission to delete production databases. Administrators may edit permitted settings only for their authorized team. Cross-tenant access, restricted environments, absolute ceilings and the production deletion review floor remain server-owned. Editing regions is allowed only within the team's authorized region set. Hard deny rules take priority over approval and allow rules.

**Approvals.** The current SDK returns a safe error for a non-allow decision and skips the handler. Its audit callback carries the tool, tenant, principal and decision. The application owns request parameters, correlation, durable approval IDs, human decisions and execution outcomes. Capture a server-generated attempt ID and normalized arguments at the invocation boundary, correlate the SDK decision within that request and provide an authorized status lookup when the SDK error envelope cannot carry details. Concurrent identical calls from different agents must remain distinguishable.

Bind a pending item to the verified requester, team, tool, exact arguments and triggering revision. A scoped administrator can reject it or authorize one replay. Replay through the guarded tool with the original requester's authority and a server-verified approval fact bound to that item. A reviewer cannot elevate the requester. Re-evaluate current restrictions and resource state. A changed request or newly applicable review condition requires fresh review. Record rejection, failed recheck, execution failure and successful execution distinctly. Consume authorization and apply the simulator change atomically. A retry after a terminal result must not execute twice.

## Dashboard and walkthrough

Ship one responsive, dark-mode widget with five navigable sections. Include keyboard navigation, visible focus, readable contrast, textual status labels, loading, error, empty and retry states. Label the environment as simulated. Reload tenant-scoped server data after each action and periodically while open so external MCP calls become visible.

| Section | What the operator can see or do |
| --- | --- |
| Overview | Inspect instance and running deployment counts, allocated CPU and RAM, GPU utilization, monthly cost and pending approvals. Lead with a timeline pairing agent attempts with actual decisions and outcomes. |
| Infrastructure | Inspect compute, GPUs, deployments, databases and firewall configuration with ownership, region, cost, utilization and status. Distinguish running or stopped resources from pending, blocked or failed attempts. |
| Policies | Inspect and edit authorized settings with units and bounds. Show prior and saved values, editor, timestamp and revision. Explain locked restrictions and surface conflicts or invalid input. |
| Approvals | Inspect agent, team, timestamp, tool, arguments, price, triggering policy and reason. Approve or reject pending items and inspect the subsequent decision and execution history. |
| Audit logs | Filter by decision, tool, resource and time. Show sanitized parameters, agent, revision, reason, approval reference and separate evaluation and execution events. |

The guided flow opens the ML Research GPU policy, sends the Mumbai request, shows the pending item, saves the new quota, replays the exact arguments, shows the created resources, tries Singapore and opens the two revisions in the audit trail. Preserve the request payload across retries. An authorized reset restores deterministic fixtures and invalidates pending approvals for the demo scope. Other teams keep their state.

## Acceptance scenarios

Start each row from its documented seed. Fix the pricing table, initial spend, resource counts and machine shapes. Configure unrelated rules to pass in each positive case. For the GPU fixture, count GPUs across all eight instances, choose an allowed shape and configure the CPU and budget rules so the GPU threshold is the only review trigger. The CPU scenario has its own starting fixture. Report resource counts and spend before and after each attempt.

| Scenario | Initial request and expected result | Change and verified outcome |
| --- | --- | --- |
| GPU quota | ML Research requests eight one-GPU instances in Mumbai. Immediate limit 2, hard maximum 16. REQUIRE_APPROVAL, zero created. | Raise the immediate limit to 8. Same server, identity and arguments yield ALLOW and eight created instances. |
| Spending | A fixed request projects monthly team spend of $1,200 against a $500 review threshold. REQUIRE_APPROVAL. | Raise the threshold to $2,000. ALLOW and show $800 remaining. A separate immutable ceiling above $2,000 still blocks a request exceeding it. |
| Region | ML Research requests the same eight GPUs in Singapore. BLOCK. | Raise ordinary quotas and budget. Singapore stays blocked and resource state is unchanged. Platform Engineering can independently use Singapore. |
| Production deletion | An eligible agent requests deletion of a seeded production database. REQUIRE_APPROVAL. | Ordinary policy edits preserve the review requirement. Rejection preserves the database. Approval permits one execution only after a successful current-policy check. Development remains blocked. |
| CPU quota | Request one Mumbai instance with 16 vCPU and 64 GB RAM. Immediate limit 4 vCPU, hard maximum 32. REQUIRE_APPROVAL. | Raise the immediate limit to 16. Same request yields ALLOW. Requests above 32 remain blocked. |

## Implementation plan

Work through the milestones in order. Check a milestone when its verification passes. The acceptance scenarios above define the expected results.

- [x] **1. Establish the scaffold.** Adapt the existing server and widget packages, replace the card module and widget entry, register the preset alias and picker entry, and bring in the shared stylesheet. Scaffold to a temporary directory with the branch CLI. Verify that the generated server starts and the client can open the bundled widget.
- [x] **2. Prove the GPU flow over MCP.** Implement the ML Research fixture, verified identities, deterministic pricing, resource store, policy provider, guarded provisioning tool and scoped policy update. Call the tool directly, change the quota, then repeat the identical request. Assert the process ID stays constant, the policy revision advances and only the allowed call creates instances.
- [x] **3. Complete the tool and policy coverage.** Add the remaining teams and seven tools, persist versioned edits and implement reset. Run the spending, region and CPU scenarios through MCP. Test cross-team access, stale policy writes, provider failures and concurrent requests against hard ceilings.
- [x] **4. Implement approvals and audit.** Correlate each SDK evaluation with its request, record pending items and add authorized review and one-time replay. Verify production deletion, rejection, a policy change between submission and replay, and two simultaneous approvals. Inspect both the audit events and the final resource state.
- [x] **5. Connect the dashboard and walkthrough.** Build the five sections in the widget package and connect their controls to the tested server operations. Run the guided GPU flow, observe an external client's call in the activity feed, and repeat after a team-scoped reset. Verify keyboard access, error states and bundled CSS in the generated widget.
- [x] **6. Validate the developer journey.** Finish the generated README and SDK guide. Scaffold via both the flag and picker, then install, typecheck, build and run the complete demo outside the workspace. Record the package versions and results required below. Track released-package availability separately from branch-build verification.

## Delivery and release evidence

1. Build the simulator and exercise all three decisions through real guarded MCP calls. Use deterministic prices and resource IDs, with tenant-scoped state across reads, writes and reset.
2. Exercise live policy changes and one-time approval replay before building the dashboard workflow. Verify that a denied or pending mutation cannot change resources even when invoked outside the widget.
3. Wire the widget, CLI preset and guided demo. Use the existing loopback HTTP pattern (default MCP endpoint `http://127.0.0.1:3100/mcp`, configurable `PORT`). Validate configuration on startup and document the widget-opening tool, connection settings, credentials and development command.
4. Include unit tests for policy validation, tenant context, hard limits, simulator transitions, pricing and approval states. Integration tests must run the SDK evaluator and invoke the real tools for every scenario above. Cover cross-team edits and reads, concurrent approvals, stale revisions, provider failure, and audit correlation. Assert both the decision and the resulting state.
5. From a clean generated project, install dependencies, typecheck both packages, build the widget and server, and run the complete guided flow end to end. Verify picker and flag scaffolding, packaged CSS, external-client activity refresh and repeatability after reset. Run affected CLI tests and the TypeScript workspace build.
6. Ship a generated README covering prerequisites, installation, local configuration, startup, MCP connection, natural-language examples for all eight tools, the five scenarios, reset, test commands, simulator pricing, isolation, approvals and preview limitations. Include a section titled **Why Dynamic Guardrails Matter for AI Agents**. Keep the SDK guide's walkthrough consistent with the shipped preset.

Release evidence must identify the tested package versions, scaffold command, start command, passing and failing checks, and any remaining limitations. The deciding demonstration is a dashboard edit followed by a different SDK decision on an identical MCP request in the same running process.

## Branch verification

A clean project outside the repository was scaffolded with the packed branch CLI using `nitrostack init guardian --preset cloudops-guardian`. The interactive picker also generated the CloudOps scaffold. Core and CLI were packed as 1.1.3 and widgets as 1.0.10. These versions identify local branch tarballs. Registry-only installation remains a release gate.

On Node 24.14.0 the generated server and widget compiled, the template sources passed ESLint, and `npm start` served the dashboard with default application settings. The domain and HTTP MCP suites passed, including all five acceptance scenarios, rejection and replay, concurrent limits, failed execution, tenant isolation and unavailable policy data. The HTTP suite also passed on Node 20.18.1.

The packaged widget completed the guided flow in Chrome through a test host bridge connected to the live MCP server. Additional checks covered mobile width, keyboard navigation, invalid policy input, external-client refresh and reset. The workspace build passed. The CLI reported 112 passing tests, the widget SDK 109, and core 1,136. The core Jest runner retained an open handle after reporting its results and was stopped.
