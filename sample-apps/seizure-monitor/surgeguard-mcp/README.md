# SurgeGuard

SurgeGuard is a policy-gated hospital surge command simulation built with the
Model Context Protocol (MCP), NitroStack, TypeScript, Next.js, and React.

It gives an incident-command team one shared operational state for capacity,
patient-flow pressure, qualified staffing, response-plan comparison, safety
checks, approval, execution, and audit history.

> [!IMPORTANT]
> SurgeGuard is an industry-style demonstration that uses synthetic data. It is
> not a clinical system, must not receive protected health information, and
> must not direct patient care. See
> [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md).

## Highlights

- One persistent simulation drives every operational view.
- Capacity, queue, and staffing metrics update from the shared local database.
- Confirmed Command Center changes synchronize across all tools.
- Patient-flow pressure responds directly to arrivals and completed queue steps.
- Planning recommendations are locked snapshots and never silently re-rank
  while a user is reviewing them.
- Unsafe plans remain visible but cannot be approved or executed.
- Plan comparison, safety review, approval, and execution are separate actions.
- Local audit history survives application restarts.
- No patient identifiers or external clinical side effects are used.

## Application views

| View | Purpose |
| --- | --- |
| Surge Command Center | Monitor the incident and apply confirmed operational changes |
| Incident Brief | Review the current situation, objectives, owners, and next actions |
| Capacity Board | Inspect licensed, staffed, occupied, cleaning, and usable beds |
| Queue Pressure | Inspect active queues, service breaches, and waiting-time pressure |
| Staffing Readiness | Compare required coverage with qualified on-shift staff |
| Response Plan Comparison | Compare one locked recommendation with alternatives |
| Plan Safety Check | Decide whether the selected plan can be approved safely |
| Candidate Plan Review | Review the locked action sequence, resources, and approvals |
| Execution Monitor | Track approved action progress and observed outcomes |

## MCP tools

The public MCP surface contains 12 focused tools:

| Tool | Purpose |
| --- | --- |
| `surge_command_center` | View or update the complete shared operational state |
| `refresh_surgeguard_view` | Refresh a connected operational widget |
| `show_incident_brief` | Open the current incident summary |
| `show_capacity` | Open capacity by care area |
| `show_queue_pressure` | Open patient-flow pressure by queue |
| `show_staffing_readiness` | Open qualified staffing coverage |
| `simulate_surge_change` | Apply a predefined synthetic surge event |
| `generate_safe_plans` | Generate and lock response-plan options |
| `check_plan_safety` | Check whether a selected plan can be approved |
| `review_surge_plan` | Open a selected plan without approving it |
| `approve_safe_plan` | Record human approval for an eligible plan |
| `execute_approved_plan` | Advance an approved simulated plan |

## Requirements

- Node.js 20.x
- npm 10.x
- NitroStack Studio for the visual MCP workflow

The supported versions are also declared in `package.json`.

## Fresh-clone setup

Install both the MCP server and widget dependencies:

```bash
npm ci
npm run install:widgets
```

No environment file is required for the synthetic demo. To customize local
settings, copy `.env.example` to `.env`. Real secrets must never be committed.

Start the development environment:

```bash
npm run dev
```

The MCP server uses STDIO in development and the widget application is served
at `http://localhost:3001`.

### Open in NitroStack Studio

1. Add a server and select **Nitro Project**.
2. Choose this repository folder.
3. Select **Studio App Canvas**.
4. Run `surge_command_center`.
5. Reopen a tool after changing its widget route so the host loads the newest
   bundled resource.

## Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local MCP and widget development environment |
| `npm run prepare:widgets` | Move stale generated widget output aside before a build |
| `npm run typecheck` | Type-check the MCP server |
| `npm run generate:contracts` | Regenerate TypeScript from the canonical contract |
| `npm run check` | Regenerate contracts, type-check, and build all widgets |
| `npm run build` | Build the MCP server and static widget bundle |
| `npm test` | Run deterministic simulation and cross-tool checks |
| `npm run ci` | Run the complete local CI sequence |
| `npm run start:prod` | Start an already-built production bundle |

Run the same verification used by GitHub Actions:

```bash
npm run ci
```

## Project structure

```text
surgeguard-mcp/
|-- .github/                     # CI and contribution templates
|-- data/                        # Ignored local simulation databases
|-- reference/database/          # Canonical production schema and MCP contracts
|-- scripts/
|   |-- generate-contracts.mjs
|   `-- validate-simulation.mjs
|-- src/
|   |-- contracts/               # Generated and runtime contract validation
|   |-- health/                  # System-health projection
|   |-- modules/surgeguard/
|   |   |-- surgeguard.repository.ts
|   |   |-- surgeguard.simulation.ts
|   |   |-- surgeguard.runtime.ts
|   |   |-- surgeguard.tools.ts
|   |   |-- surgeguard.resources.ts
|   |   `-- surgeguard.prompts.ts
|   `-- widgets/
|       |-- app/                 # Next.js widget routes
|       |-- components/          # Shared widget shell
|       `-- widget-manifest.json
|-- .env.example
|-- PRODUCTION_READINESS.md
|-- package.json
`-- README.md
```

Generated output, dependencies, local databases, temporary files, logs, editor
state, and local assistant configuration are excluded by `.gitignore`.

## Shared-state behavior

Operational views are live:

- capacity;
- patient queues;
- staffing; and
- incident status.

Decision views are snapshot-based:

- plan comparison;
- plan review; and
- plan safety check.

A planning snapshot changes only after a confirmed Command Center update or an
explicit plan-generation action. This prevents a recommendation from changing
while someone is reviewing or approving it.

## Data and safety model

- The default database is created at `data/surgeguard-demo.sqlite`.
- `SURGEGUARD_DATABASE_PATH` can override the local path.
- The database and all SQLite sidecar files are ignored by Git.
- Validation uses a temporary isolated database.
- Blocked plans cannot be approved or executed.
- Approval and execution remain distinct, human-controlled tool calls.
- The demo exposes synthetic operational records only.
- The PostgreSQL production blueprint remains under `reference/database/`.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request. Every
change should pass:

```bash
npm run ci
```

Do not include real patient data, credentials, private keys, local databases,
generated output, or development logs in an issue or pull request.

## Security

See [SECURITY.md](./SECURITY.md) for responsible reporting guidance and the
current demonstration-only security boundary.

## License

No open-source license has been selected. Add a license before distributing,
forking, or reusing this project outside its intended hackathon context.
