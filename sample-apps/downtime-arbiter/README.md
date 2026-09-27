# Downtime Arbiter

Downtime Arbiter is a NitroStack sample MCP server for negotiating factory machine downtime between Maintenance, Production, and Arbiter agents.

Team: Codeblood

Contributors: Rithun K P, Shruthik Binduraj, Balagopal V, Naveen Raj

The core demo is not "an LLM makes a scheduling guess." The server enforces the important rules in code:

- Maintenance can read sensor detail and raw risk percentages.
- Production can read only coarse urgency tiers.
- Risk is modeled as P-F curve trajectories across now, +24h, +72h, and +96h.
- The Arbiter resolves negotiations deterministically with cost and safety thresholds.
- Negotiations are capped at exactly two rounds and close after a final decision.

## Why It Wins

Most maintenance demos collapse into a generic scheduling chatbot. Downtime Arbiter is sharper:

1. It demonstrates multi-agent context isolation as a server-side invariant.
2. It uses a causal risk trajectory rather than a flat priority score.
3. It has a deterministic arbiter, so final decisions are auditable and repeatable.
4. It ships with an evaluation command that proves the important invariants still hold.
5. It runs as a NitroStack MCP server with tools, resources, and prompts available in NitroStudio.

## Quick Start

```bash
npm install
npm run build
npm run dev
```

Open the server in NitroStudio and inspect the Downtime Arbiter tools, resources, prompts, and widget.

## Demo Flow

Use the `downtimearbiter://demo_runbook` resource in NitroStudio, or run this sequence manually:

1. `get_machine_signal` as `Maintenance` for `MACH_003`.
   Shows full sensor detail and raw risk.
2. `get_machine_signal` as `Production` for `MACH_003`.
   Shows server-side access denial.
3. `get_urgency_tier` as `Production` for `MACH_003`.
   Shows only a coarse tier, never raw risk.
4. `explain_risk_trajectory` as `Maintenance` for `MACH_002`.
   Shows P-F risk at now, +24h, +72h, and +96h.
5. `check_plan_constraints` for `MACH_001` from `2025-01-16T09:00:00Z` to `2025-01-16T10:00:00Z`.
   Shows a technician scheduling conflict.
6. `propose_window` as `Maintenance`, then `Production`, for `MACH_002`.
   Creates a negotiation round.
7. `resolve_negotiation` as `Arbiter` for `MACH_002`.
   Shows deterministic lower-cost selection and override behavior.
8. Try another `propose_window` for `MACH_002`.
   Shows that resolved negotiations are closed.

## Evaluation Metrics

Run:

```bash
npm run eval
```

The eval emits a JSON report with:

- `context_isolation_passed`
- `pf_curve_model_passed`
- `deterministic_arbiter_passed`
- `negotiation_protocol_passed`
- `schedule_constraints_passed`
- total checks, passed checks, failed checks, and pass rate

A winning demo should show `failed_checks: 0` and `pass_rate_pct: 100`.

## NitroStack Surface

Core tools:

- `get_machine_signal`
- `get_urgency_tier`
- `explain_risk_trajectory`
- `propose_window`
- `check_plan_constraints`
- `resolve_negotiation`

Dashboard tool:

- `get_negotiation_dashboard`

Resources:

- `downtimearbiter://rolling_plan`
- `downtimearbiter://negotiation_log`
- `downtimearbiter://demo_runbook`
- `downtimearbiter://evaluation_rubric`

Prompts:

- `causal_rationale_prompt`
- `plan_briefing_prompt`
- `judge_demo_prompt`

Widgets:

- `negotiation-console`

## Agent Orchestrator

`npm run agent-demo` is an optional stretch-goal script that connects to the local MCP server over stdio and uses Groq for Maintenance and Production agent loops. It is not required for the core NitroStack demo, and the full two-round Groq-backed run has not been verified end to end because the last run hit Groq rate/function-call limits.

## License

MIT
