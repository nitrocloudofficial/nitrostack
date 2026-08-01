# NeuroTwin Evolver
A self-evolving industrial meta-agent built on the NitroStack MCP framework. Instead of following a fixed policy, it detects environmental shifts its original design never anticipated, proposes candidate logic mutations, validates them against safety rules, and deploys the fittest one - across logistics, manufacturing, energy, and safety as a single cross-domain problem.

## Architecture
This is a genuine multi-agent system: each agent owns one responsibility and hands off to the next rather than one model wearing multiple hats.

| Agent | Responsibility |
|---|---|
| Logic-Refactor Agent | Proposes candidate logic mutations for a unit in response to an environmental shift |
| NeuroTwin Validator Agent | Checks every proposed mutation against symbolic safety rules (battery floor, safety margin, latency ceiling) before it can be deployed |
| Resource Manager Agent | Treats energy price, carbon intensity, and delivery time pressure as a single multi-objective problem and issues a fleet-wide directive (normal/gliding/eco/priority-speed) |
| Protocol-Evolver Agent | Monitors swarm-wide communication health and switches network topology (leader-follower/mesh/cellular) when links degrade |
| Ethical-Guardrail Agent | Maintains a dynamic, self-updating set of regulatory and ethical compliance rules, ensuring every deployed mutation stays within evolving legal and safety boundaries |

The orchestration layer is not a fifth agent - it is the coordination logic that lets the above agents pass messages to each other in sequence: directive -> propose -> validate -> deploy.

## Tools
| Tool | Type | Description |
|---|---|---|
| view_fleet_twin | Tool | Live digital-twin map of the fleet with status, battery, throughput |
| monitor_environmental_shifts | Tool | Lists detected shifts and their resolution status |
| get_unit_detail | Tool | Per-unit telemetry and mutation history |
| get_resource_directive | Tool | Current Resource Manager directive and rationale |
| view_swarm_protocol | Tool | Current comm-link health and network topology |
| inject_environmental_shift | Tool | Manually reports a new shift for demo/testing |
| run_mutation_cycle | Tool | Synchronous run of the full propose -> validate -> deploy pipeline |
| evolve_logic | Task | Same pipeline, staged with live progress (optional async) |
| self_heal_unit | Task | Proactive recovery for a degraded unit (required async) |
| evolve_swarm_topology | Task | Protocol-Evolver Agent re-engineers swarm topology on demand (required async) |

## Getting started
```bash
npm run install:all
npm run dev
```
Then open the project in NitroStudio (https://nitrostack.ai/studio) to test tools and view widgets, or connect any MCP-compatible client to the running STDIO server.

## Built for
Agentic AI Hackathon 2026 - Amrita Vishwa Vidyapeetham x NitroStack