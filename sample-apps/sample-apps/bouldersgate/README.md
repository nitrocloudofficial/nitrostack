# BouldersGate

**Compute as a negotiated capability, not a granted resource.**

## Hackathon submission

- **Team:** just_another_team
- **Project:** BouldersGate
- **Live MCP:** <https://bouldersgate-6a6-just-another-team-amrita-university-coimbatore.app.nitrocloud.ai/mcp>

BouldersGate is a NitroStack MCP server that sits between an AI agent and real
execution. An agent states what a task genuinely needs; BouldersGate answers with an
exact offer, a structured counter-offer that itemizes every reduction, or a hard
denial — and creates nothing until the agent explicitly accepts.

## The problem

Today an agent that needs to run code gets a shell, a container, or a cloud key.
The grant is all-or-nothing and invisible: nobody can see what was asked for
versus what was actually needed, the agent can't reason about *why* it was
restricted, and revocation is manual.

Two failure modes follow:

- **Over-grant.** The agent asks for 16 GB, root, and open egress "to be safe",
  and gets it, because the only alternative is failure.
- **Opaque denial.** The agent is blocked with no machine-readable reason, so it
  retries the same request, or silently degrades.

## The approach

Treat provisioning as a two-phase negotiation with a machine-readable transcript.

```
request_compute   →  offer | counter-offer | denial      (creates nothing)
accept_offer      →  live environment                    (consumes offer, once)
execute_command   →  bounded run inside the grant
release_environment → destroyed
```

Three properties make this more than a wrapper:

1. **Requesting is not provisioning.** `request_compute` has no side effect on
   infrastructure. An agent can explore the boundary of what it may have without
   burning resources or leaving a footprint.
2. **Every reduction is structured data.** A counter-offer returns a `deltas`
   array — `path`, `requested`, `granted`, `reason` — so an agent can *replan*
   against the grant instead of retrying blindly.
3. **Policy stays opaque.** The policy object is never exposed as an MCP
   resource. The agent learns the shape of its grant through outcomes, not by
   reading the ruleset — so it can adapt without being able to game it.

### Reduce vs. deny

Not every excess is negotiable. BouldersGate distinguishes:

| Kind | Meaning | Example |
|---|---|---|
| `reduced` | Quantitative excess, clamped to the cap | 16384 MB → 4096 MB |
| `narrowed` | Scope intersected with what policy permits | `unrestricted` egress → `none` |
| **denial** | No safe reduced form exists; returns **no offer** | `privileged`, `hostFilesystem`, `dockerSocket` |

A privileged request is not quietly downgraded to unprivileged. Silently
granting something adjacent to what was asked is how agents end up reasoning
against a world that doesn't exist.

## Architecture

```
MCP tools (compute.tools.ts)         ← guarded surface, one tool per protocol step
        │
ComputeService                       ← negotiation, one-time acceptance, ownership
        ├── PolicyService            ← opaque rules → offer / deltas / denials
        ├── StateStore               ← offers, environments, one-time offer claim
        ├── AuditLog                 ← bounded per-agent event log
        │
ComputeBackendService                ← picks the strongest backend this host has
        │
ComputeProvider (interface)          ← protocol/policy never touches materialization
        ├── DockerComputeProvider    ← container backend
        │     └── RuntimeRegistry    ← Docker Hub digest resolution
        └── ProcessComputeProvider   ← bounded-process backend (no daemon needed)
```

The `ComputeProvider` seam is the load-bearing one: the negotiation protocol,
the policy engine, and the audit trail know nothing about Docker. Two backends
already sit behind it, and neither the tools nor the policy changed to add the
second.

### Backend selection

A container is the stronger boundary, so it wins whenever a Docker daemon
answers. NitroCloud runs on Knative and exposes no daemon to the deployed
process, so the same build falls back to the process backend there instead of
failing at `accept_offer`. `BOULDERSGATE_BACKEND=docker|process` pins the choice
when a deployment wants one backend or nothing.

The agent is told which backend served it, in every offer, before it accepts.

| | `docker` | `process` |
|---|---|---|
| Isolation | Container, shared kernel | OS process, shared kernel and user |
| Filesystem | Read-only root, tmpfs workspace | Node permission model, workspace only |
| Environment | Container-only env | **No inherited environment at all** |
| Egress | `--network none` | Private network namespace where the host allows one |
| Memory | cgroup limit | V8 heap cap |
| Executables | Anything in the image | `node` only |

Neither is a boundary for genuinely hostile code. That is what E2B's Firecracker
and Modal's gVisor are for, and swapping one in is a provider file.

## Runtime attestation

A tag is mutable. `node:20-alpine` can point at a different image tomorrow than
it did when the offer was made, so a grant that says "node20" promises less than
it appears to.

At offer time BouldersGate resolves the runtime through the **Docker Hub registry
API** (`registry-1.docker.io`, the OCI Distribution spec) and pins the immutable
digest into the offer. `accept_offer` materializes *that digest*, not the tag.

```jsonc
"attestation": {
  "backend": "docker",
  "reference": "node:20-alpine",
  "digest": "sha256:fb4cd12c85ee…",
  "source": "registry"
}
```

The agent can compare the digest in its offer against the one on the environment
it received, and prove it got what policy actually promised. A registry outage
degrades the attestation — `source: "unavailable"`, stated to the agent — rather
than blocking negotiation. On the process backend the attestation reports the
real host Node version and which bounds are actually active on that host.

### MCP surface

| Tool | Effect |
|---|---|
| `request_compute` | Evaluate a requirement. Returns offer, counter-offer, or denial. **Provisions nothing.** |
| `accept_offer` | The only provisioning step. Consumes an offer exactly once. |
| `execute_command` | Run an argv vector in an owned environment. No shell is interposed. |
| `release_environment` | Destroy an owned environment. Idempotent. |
| `list_environments` | Owner-scoped. Never returns provider identifiers. |
| `list_audit_events` | Owner-scoped decision and lifecycle trail. |

- **Resource** `bouldersgate://protocol` — the public negotiation contract. Policy
  is deliberately *not* published here.
- **Prompt** `negotiate_compute` — guides an agent to derive requirements from
  the task rather than asking for a round number.

## Security model

- **Identity.** Every tool is behind `AgentApiKeyGuard`. Keys come from
  `BOULDERSGATE_API_KEY*` environment variables — one per calling agent,
  separate from any NitroCloud credential. The identity exposed to the protocol
  is a SHA-256 fingerprint (`agent_<16 hex>`), never a key preview.

### How the credential reaches the guard

A guard sees `context.metadata`, which NitroStack builds from the `_meta` object
inside the tool call's **arguments**. It never sees HTTP headers. So an
`x-api-key` *header* is silently ignored and the call is denied:

```jsonc
{ "method": "tools/call",
  "params": { "name": "request_compute",
              "arguments": { "runtime": "node20", "_meta": { "apiKey": "<key>" } } } }
```

`ApiKeyModule`'s own `headerName` option is a naming convention for that
metadata field, not a transport. Worth knowing before wiring up a client that
authenticates with headers everywhere else.
- **Ownership.** Environments are owner-scoped. A second agent cannot execute
  in, list, or release another agent's environment.
- **One-time offers.** An offer carries a TTL and can be claimed exactly once;
  a replayed `accept_offer` fails.
- **No shell injection surface.** `execute_command` takes an argument vector and
  spawns it as argv. No shell is inserted, so there is no string to escape.
- **Container hardening.** `--network none`, read-only root filesystem,
  unprivileged UID, all capabilities dropped, `no-new-privileges`, PID and file
  limits, memory/CPU caps, a TTL-bounded lifetime, and bounded command time and
  output.
- **Process hardening.** Node's permission model confines reads and writes to
  the environment's workspace; the child inherits an **empty environment**, so
  no key this server holds is readable from inside a grant; a private network
  namespace removes egress where the host permits one. Each of these is covered
  by a test that asserts the escape actually fails.
- **Audit hygiene.** The audit log records decisions and lifecycle events. It
  records no command text, no credentials, and no provider references.

### Egress

The demo policy grants **no network**, because `--network none` is something the
provider can actually enforce. A host allowlist is representable in the protocol
(`mode: 'allowlist'`) and is intersected during negotiation — but it will not be
granted until a real egress proxy exists to enforce it. Promising an allowlist
that nothing enforces would be the exact failure this project argues against.

## Local setup

Requires Node 20+. A Docker daemon is optional — without one, BouldersGate serves
the process backend instead of refusing to run.

```bash
npm run install:all
cp .env.example .env
```

Generate a key and put it in `.env` as `BOULDERSGATE_API_KEY_DEMO`:

```bash
openssl rand -hex 32
```

Then:

```bash
npm run dev
```

Build and test:

```bash
npm test
```

`npm test` runs the NitroStack production build first, so a type error or a
broken widget bundle fails the gate before any test executes.

The suite is not only unit tests. It materializes a real container and a real
bounded process, runs commands in both, asserts that the network and filesystem
escapes fail, and destroys them. The Docker cases skip themselves when no daemon
is reachable; everything else runs everywhere.

## Seeing it work

One command drives the entire protocol against the live deployment and prints
the failures as well as the successes:

```bash
BOULDERSGATE_API_KEY=<key> node scripts/demo.mjs
```

To drive a local server instead, start one on HTTP first. `npm run dev` speaks
**STDIO only** and opens no port, so it cannot be reached this way:

```bash
MCP_TRANSPORT_TYPE=http PORT=3000 npm run start:prod
BOULDERSGATE_API_KEY=<key> node scripts/demo.mjs http://localhost:3000/mcp
```

Locally a Docker daemon is reachable, so the container backend is selected and
the offer carries a real image digest — the part the NitroCloud deployment
cannot show, since Knative gives it no daemon.

It walks eight steps: an oversized request answered with an itemized
counter-offer, proof that negotiating provisioned nothing, a hard denial, the
acceptance that does provision, real code running inside the grant, four
boundary assertions, a replayed offer that must be rejected, and the release
plus audit trail. The script exits non-zero if any boundary assertion fails.

## Testing with NitroStudio

NitroStudio is the recommended client for driving the negotiation by hand.

1. Download NitroStudio: <https://nitrostack.ai/studio>
2. Start the server: `npm run dev`
3. Connect Studio to the local server and set the `x-api-key` metadata field to
   your `BOULDERSGATE_API_KEY_DEMO` value.
4. Walk the full loop:
   - `request_compute` with `memoryMb: 16384`, `durationMinutes: 1440`,
     `network: { mode: "unrestricted" }` → expect a **counter-offer** with three
     `reduced` deltas and one `narrowed` delta.
   - `request_compute` with `privileged: true` → expect a **denial** with no
     offer attached.
   - Read `offer.attestation.digest` on the counter-offer and keep it.
   - `accept_offer` with the counter-offer's `offerId` → environment created,
     carrying the same digest.
   - `accept_offer` with the same `offerId` again → fails.
   - `execute_command` with `argv: ["node", "-e", "console.log(process.memoryUsage())"]`.
   - `release_environment`, then `list_environments` to confirm it is gone.
   - `list_audit_events` to read the decision trail.

## Prototype boundaries

Stated plainly, because a demo that hides its edges is worse than one that
names them:

- **State is in memory.** Offers, environments, and audit events do not survive a
  server restart. Persistence is a storage swap, not a protocol change.
- **One runtime.** The policy permits `node20` only. The type system carries
  `node22`, `python312`, and `python313`; the Docker provider implements
  `node:20-alpine`.
- **No egress allowlist enforcement.** See above — allowlists are negotiable in
  the protocol but never granted. `none` *is* enforced, on both backends.
- **The process backend runs `node` only.** It has no image to draw other
  executables from, so it refuses them by name rather than failing obscurely.
- **Neither backend isolates hostile code.** Both share the host kernel. The
  process backend additionally shares the host user. The bounds it does enforce
  are tested, but a determined escape is a different class of problem, and the
  answer to it is a microVM backend behind the same interface.
- **One widget.** `request_compute` renders the negotiation outcome; the other
  five tools return plain structured content.
- **Framework quirk.** Importing `@nitrostack/core` leaves an un-`unref`'d timer
  running, so a Node test process never exits on its own. `npm test` passes
  `--test-force-exit` to work around it. This affects tests only — a server is
  supposed to stay alive.

## Deployment

**Live:** <https://bouldersgate-6a6-just-another-team-amrita-university-coimbatore.app.nitrocloud.ai/mcp>

Knative exposes no Docker daemon, so the deployed server selects the process
backend on its own and runs the same negotiation protocol end to end there.
Pushes to `bouldersgate` auto-deploy through the NitroCloud GitHub App webhook.

BouldersGate deploys to NitroCloud from this repository. NitroCloud containerizes
the build and rolls it out on Knative, so no Dockerfile lives here.

Set these in the NitroCloud project environment:

| Variable | Value |
|---|---|
| `BOULDERSGATE_API_KEY_DEMO` | A random 64-hex string. One variable per calling agent. |
| `MCP_TRANSPORT_TYPE` | `http` |
| `BOULDERSGATE_BACKEND` | Leave unset. Selection resolves to `process` there. |

Never set a NitroCloud credential as an `BOULDERSGATE_API_KEY*` variable — agent
keys and platform keys are separate authorities on purpose.

## Links

- NitroStack docs: <https://docs.nitrostack.ai>
- NitroStudio: <https://nitrostack.ai/studio>
