# Dep Bouncer

npm install, reimagined for AI agents.

**Team:** Giberelin (Harsha B S) · Heapify × NitroStack MCP Hackathon · Track:
Developer Tools.

- **Demo film:** https://youtu.be/w9Ax5KPUGD8
- **Live MCP endpoint:**
  https://dep-bouncer-6ad22414-giberelin-heapify-global-community.app.nitrocloud.ai/mcp
- **Full repository:** https://github.com/harsha31bs07-blip/dep-bouncer (project
  README, benchmark results, and CI).

## What it does

AI coding agents can install a newly published npm release as soon as it appears.
`npm audit` depends on published advisories, which can lag a hijack by hours. For
five documented incidents, OSV's first entry appeared 1.7–18.2 hours after
publication; during that gap, `npm audit` reported zero vulnerabilities.

Dep Bouncer is an MCP server an agent calls before installing or upgrading an npm
package. It compares the release with the package's own recent history: publisher
and provenance, install scripts, dependencies, release timing, and code changes,
alongside OSV. It returns an evidence-backed ALLOW, REVIEW, or BLOCK verdict and,
when available, a version that passed the checks.

## MCP surface

| Surface | Purpose |
|---|---|
| `bouncer_check_package` | Check a package release or `latest` before install. |
| `bouncer_check_upgrade` | Check a version upgrade and summarize changes. |
| `bouncer_safe_version` | Find a recent version in a range that passes checks. |
| `bouncer_check_manifest` | Check dependencies in a `package.json`; supports MCP Task progress and cancellation. |
| `bouncer_review_install_scripts` | Explain install scripts and return APPROVE, REVIEW, or DENY guidance. |
| `bouncer_diff_release` | Compare release metadata and files. |
| `bouncer_replay_incident` | Replay the axios, keyv, chalk, nx, or tinycolor incident. |
| Resources | `bouncer://policy`, `bouncer://stats` (aggregate tool metrics), and `incidents://list`. |
| `safe_install` prompt | Instructions for checking and acting on dependency changes. |
| `verdict-card` widget | Displays the verdict, evidence, and safe-version action. |

## NitroStack features used

- DI modules and injectable services compose registry, analysis, incidents, bouncer,
  health, and observability components.
- `@Tool`, `@Resource`, `@Prompt`, and `@Widget` register the MCP tools, resources,
  prompt, and verdict card.
- `@RateLimit` limits tool calls; `@Cache` caches selected policy, incident-list,
  and replay responses.
- `MetricsInterceptor` collects aggregate calls, errors, latency, and verdict totals
  for `bouncer://stats`.
- NitroStack `ApiKeyModule` guards tools when API keys are configured;
  authentication is off by default for the public demo.
- MCP Tasks provide progress and cancellation for manifest checks.
- `@HealthCheck` exposes process, npm registry, and OSV health probes.

## Results

- **5/5** replayed hijacks were blocked.
- Among the latest releases of the **top 200** npm packages, **199 ALLOW / 1 REVIEW
  / 0 BLOCK**. The REVIEW is a human-review signal, not a block.
- **16** findings from security review were fixed.
- Live endpoint smoke test: **39/39** checks passing in the latest run; CI runs it
  hourly.

Benchmark and smoke-test results are snapshots and can change as npm releases
change.

## Run locally

Requires Node.js 20.18 or newer. From the project directory:

```bash
npm install
npm run build
npm test
npm run dev
```

`npm run dev` starts the development server using stdio, suitable for NitroStudio.
To serve MCP over HTTP, run:

```bash
npm start
```

No environment variables are required. Optional settings are documented in
`.env.example`, including transport mode, port, log level, and API keys. In
development the default transport is stdio; production defaults to dual transport.
Set `MCP_TRANSPORT_TYPE=http` when you want HTTP only.

To use the hosted server, connect any Streamable HTTP MCP client to the live
endpoint above.

### Claude Code install guard

The optional `guard/` hook checks explicit package install commands before the agent
runs them. Add this to `.claude/settings.json` (or `~/.claude/settings.json`),
replacing the script path with the absolute path to your checkout:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/dep-bouncer/guard/dep-bouncer-guard.mjs"
          }
        ]
      }
    ]
  }
}
```

The hook denies BLOCK, asks for approval on REVIEW, and allows ALLOW. See
[`guard/README.md`](guard/README.md) for configuration and coverage details.

## Safety

Replayed incidents are labelled reconstructions. They combine real last-good release
metadata and documented incident details with benign stand-in code that mimics the
reported structure. The removed malicious release code is not included; package code
is never executed by Dep Bouncer.

## License

MIT. See [`LICENSE`](LICENSE).
